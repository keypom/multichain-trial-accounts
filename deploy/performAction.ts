// performAction.ts

import { Account } from "@near-js/accounts";
import { sendTransaction } from "./utils";
import { ActionToPerform, Config, TrialData } from "./types";
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
): Promise<{ signatures: string[][]; nonces: string[]; blockHash: string }> {
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
  let signerAccount = await near.account(trialAccountId);

  const signatures: string[][] = [];
  const nonces: string[] = [];

  const provider = signerAccount.connection.provider;
  const block = await provider.block({ finality: "final" });
  const blockHash = block.header.hash;

  const accessKeys = await signerAccount.getAccessKeys();
  const accessKeyForSigning = accessKeys[0];
  let nonce = accessKeyForSigning.access_key.nonce;

  signerAccount = await near.account(contractAccountId);
  for (const actionToPerform of actionsToPerform) {
    const { targetContractId, methodName, args, gas, attachedDepositNear } =
      actionToPerform;
    nonce = BigInt(nonce) + 1n;

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
        nonce: nonce.toString(),
        block_hash: blockHash,
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
    nonces.push(nonce.toString());
  }

  return { signatures, nonces, blockHash };
}

interface BroadcastTransactionParams {
  signerAccount: Account;
  actionToPerform: ActionToPerform;
  signatureResult: string[]; // Signature result from the MPC
  nonce: string;
  blockHash: string;
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
  const { signerAccount, actionToPerform, signatureResult, nonce, blockHash } =
    params;

  const { targetContractId, methodName, args, gas, attachedDepositNear } =
    actionToPerform;

  const serializedArgs = new Uint8Array(Buffer.from(JSON.stringify(args)));

  const provider = signerAccount.connection.provider;

  const blockHashBytes = bs58.decode(blockHash);

  const accessKeys = await signerAccount.getAccessKeys();
  const accessKeyForSigning = accessKeys[0];
  console.log("Access key for signing:", accessKeyForSigning);

  const actions: Action[] = [
    actionCreators.functionCall(
      methodName,
      serializedArgs,
      BigInt(gas),
      BigInt(parseNearAmount(attachedDepositNear)!),
    ),
  ];

  // Log the transaction components for comparison
  console.log("Broadcasting transaction...");
  console.log("Signer Account:", signerAccount.accountId);
  console.log("Target Contract:", targetContractId);
  console.log("Method Name:", methodName);
  console.log("Arguments (Uint8Array):", Array.from(serializedArgs));
  console.log("Gas:", gas);
  console.log("Deposit:", attachedDepositNear);
  const rawPublicKey = accessKeyForSigning.public_key.replace("secp256k1:", "");
  const publicKeyBytes = bs58.decode(rawPublicKey);
  console.log("Public Key (Decoded):", Array.from(publicKeyBytes));

  try {
    const blockHashBytes = bs58.decode(blockHash);
    console.log("Block Hash (Decoded):", Array.from(blockHashBytes));
  } catch (error) {
    console.error("Failed to decode block hash:", blockHash);
    console.error(error);
  }

  console.log("Nonce:", nonce);
  console.log("Actions:", actions);

  const transaction = createTransaction(
    signerAccount.accountId,
    PublicKey.fromString(accessKeyForSigning.public_key),
    targetContractId,
    nonce,
    actions,
    blockHashBytes,
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

  // Send the signed transaction
  try {
    const result = await provider.sendTransaction(signedTransaction);
    console.log("Transaction Result:", result);
  } catch (error) {
    console.error(error);
  }
}

export function checkActionValidity(
  actionsToPerform: ActionToPerform[],
  trialData: TrialData,
): void {
  for (const action of actionsToPerform) {
    const { targetContractId, methodName, gas, attachedDepositNear } = action;

    // Check if the method is allowed
    if (!trialData.allowedMethods.includes(methodName)) {
      throw new Error(`Method ${methodName} is not allowed`);
    }

    // Check if the contract is allowed
    if (!trialData.allowedContracts.includes(targetContractId)) {
      throw new Error(`Contract ${targetContractId} is not allowed`);
    }

    // Check gas limit
    if (trialData.maxGas && parseInt(gas) > trialData.maxGas) {
      throw new Error(`Gas ${gas} exceeds maximum allowed ${trialData.maxGas}`);
    }

    // Check deposit limit
    if (
      trialData.maxDeposit &&
      BigInt(parseNearAmount(attachedDepositNear)!) >
        BigInt(trialData.maxDeposit)
    ) {
      throw new Error(
        `Deposit ${attachedDepositNear} exceeds maximum allowed ${trialData.maxDeposit}`,
      );
    }

    // Additional checks can be added here (e.g., usage constraints)
  }
}
