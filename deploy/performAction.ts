// performAction.ts

import { Account } from "@near-js/accounts";
import { sendTransaction } from "./utils";
import { ActionToPerform, Config } from "./types";
import { baseDecode, parseNearAmount } from "@near-js/utils";
import { KeyPair, KeyType, PublicKey } from "@near-js/crypto";
import {
  Action,
  actionCreators,
  createTransaction,
  Signature,
  SignedTransaction,
} from "@near-js/transactions";
import { Near } from "@near-js/wallet-account";
// Import elliptic and crypto libraries
import * as elliptic from "elliptic";
import * as crypto from "crypto";
import bs58 from "bs58";

interface PerformActionsParams {
  near: Near;
  config: Config;
  trialAccountId: string;
  trialAccountSecretKey: KeyPair;
  contractAccountId: string;
  actionsToPerform: ActionToPerform[];
}

/**
 * Performs one or more actions by requesting signatures from the MPC.
 *
 * @param params - The parameters required to perform actions.
 * @returns A Promise that resolves to an array of signature arrays.
 */
export async function performActions(
  params: PerformActionsParams,
): Promise<string[][]> {
  const {
    near,
    config,
    trialAccountId,
    trialAccountSecretKey,
    contractAccountId,
    actionsToPerform,
  } = params;

  // Set the trial key in the keyStore
  const keyStore: any = (near.connection.signer as any).keyStore;
  await keyStore.setKey(
    config.networkId,
    contractAccountId,
    trialAccountSecretKey,
  );
  const signerAccount = await near.account(contractAccountId);

  const signatures: string[][] = [];

  for (const actionToPerform of actionsToPerform) {
    const { targetContractId, methodName, args, gas, attachedDepositNear } =
      actionToPerform;

    console.log(
      `Performing action: ${methodName} on contract: ${targetContractId}`,
    );

    const serializedArgs = Array.from(Buffer.from(JSON.stringify(args)));

    // Call the perform_action method on the contract
    const result = await sendTransaction({
      signerAccount,
      receiverId: contractAccountId,
      methodName: "perform_action",
      args: {
        contract_id: targetContractId,
        method_name: methodName,
        args: serializedArgs,
        gas,
        deposit: parseNearAmount(attachedDepositNear),
      },
      deposit: "0",
      gas,
    });

    const sigBase64 = Buffer.from(
      (result.status as any).SuccessValue,
      "base64",
    ).toString("utf-8");
    const sigJSON = JSON.parse(sigBase64);

    // Extract r, s, and recovery_id
    const sigRes: string[] = [
      sigJSON.big_r.affine_point.slice(0, 64),
      sigJSON.s.scalar,
      sigJSON.recovery_id.toString(),
    ];

    signatures.push(sigRes);
  }

  return signatures;
}

interface BroadcastTransactionParams {
  signerAccount: Account;
  actionToPerform: ActionToPerform;
  signatureResult: string[]; // Signature result from the MPC
}

/**
 * Broadcasts a signed transaction to the NEAR network.
 *
 * @param params - The parameters required to broadcast the transaction.
 * @returns A Promise that resolves when the transaction is broadcasted.
 * @throws Will throw an error if broadcasting fails.
 */
export async function broadcastTransaction(
  params: BroadcastTransactionParams,
): Promise<void> {
  const { signerAccount, actionToPerform, signatureResult } = params;

  const { targetContractId, methodName, args, gas, attachedDepositNear } =
    actionToPerform;

  const serializedArgs = new Uint8Array(Buffer.from(JSON.stringify(args)));

  const provider = signerAccount.connection.provider;
  const block = await provider.block({ finality: "final" });
  const blockHash = block.header.hash;

  const accessKeys = await signerAccount.getAccessKeys();
  const accessKeyForSigning = accessKeys[0];
  const nonce = BigInt(accessKeyForSigning.access_key.nonce) + 1n; // Increment nonce

  const actions: Action[] = [
    actionCreators.functionCall(
      methodName,
      serializedArgs,
      BigInt(gas),
      BigInt(parseNearAmount(attachedDepositNear)!),
    ),
  ];

  const transaction = createTransaction(
    signerAccount.accountId,
    PublicKey.fromString(accessKeyForSigning.public_key),
    targetContractId,
    nonce,
    actions,
    baseDecode(blockHash),
  );

  // Construct the signature
  const r = Buffer.from(signatureResult[0], "hex");
  const s = Buffer.from(signatureResult[1], "hex");
  const recoveryId = parseInt(signatureResult[2], 10);

  if (r.length !== 32 || s.length !== 32) {
    throw new Error("Invalid signature component length");
  }

  const combinedSignature = Buffer.concat([r, s, Buffer.from([recoveryId])]);

  const signedTransaction = new SignedTransaction({
    transaction,
    signature: new Signature({
      keyType: KeyType.SECP256K1,
      data: combinedSignature,
    }),
  });

  // Recover the public key from the signature
  const ec = new elliptic.ec("secp256k1");

  // Hash the transaction data (message)
  const serializedTx = transaction.encode();
  const msgHash = crypto.createHash("sha256").update(serializedTx).digest();

  const signatureObj = {
    r: r.toString("hex"),
    s: s.toString("hex"),
  };

  const recoveryParam = recoveryId; // Should be an integer between 0 and 3

  // Recover the public key point
  const pubKeyPoint = ec.recoverPubKey(msgHash, signatureObj, recoveryParam);

  // Get the uncompressed public key (without the prefix byte)
  const publicKeyRecoveredBuffer = Buffer.from(
    pubKeyPoint.encode("hex", false),
    "hex",
  );

  // Convert the recovered public key to NEAR format
  // NEAR's secp256k1 public keys are formatted as 'secp256k1:<base58-encoded x and y>'
  const x = publicKeyRecoveredBuffer.slice(1, 33); // Skip the prefix byte
  const y = publicKeyRecoveredBuffer.slice(33, 65);
  const keyData = Buffer.concat([x, y]);
  const base58EncodedKeyData = bs58.encode(keyData);
  const publicKeyRecoveredString = `secp256k1:${base58EncodedKeyData}`;

  // Expected public key from access key
  const expectedPublicKey = accessKeyForSigning.public_key;
  // Compare the recovered public key with the expected public key
  const isSameKey = publicKeyRecoveredString === expectedPublicKey;

  // Send the signed transaction
  try {
    const result = await provider.sendTransaction(signedTransaction);
    console.log("Transaction Result:", result);
  } catch (error) {
    console.error(error);
  }

  console.log("Public Key On Account: ", expectedPublicKey);
  console.log("Public Key Used for Signature:", publicKeyRecoveredString);
  console.log(`Do the keys match? ${isSameKey}`);
}
