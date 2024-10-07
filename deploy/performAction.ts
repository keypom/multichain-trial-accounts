import { Account } from "@near-js/accounts";
import { baseDecode, parseNearAmount } from "@near-js/utils";
import { sendTransaction } from "./utils";
import { ActionToPerform } from "./types";
import { PublicKey } from "@near-js/crypto";
import {
  Action,
  actionCreators,
  createTransaction,
  Signature,
  SignedTransaction,
} from "@near-js/transactions";

export async function performAction(
  signerAccount: Account,
  contractAccountId: string,
  actionToPerform: ActionToPerform,
): Promise<string[]> {
  const { targetContractId, methodName, args, gas, attachedDepositNear } =
    actionToPerform;
  console.log(
    `Performing action: ${methodName} on contract: ${targetContractId}`,
  );

  // Serialize the method arguments into a byte array
  const serializedArgsBuffer = Buffer.from(JSON.stringify(args));

  // Convert the Buffer into an array of numbers (bytes)
  const serializedArgs = Array.from(serializedArgsBuffer);

  // Call the perform_action method on the contract
  const result = await sendTransaction({
    signerAccount,
    receiverId: contractAccountId,
    methodName: "perform_action",
    args: {
      contract_id: targetContractId,
      method_name: methodName,
      args: serializedArgs, // Pass the base64-encoded string
      gas,
      deposit: parseNearAmount(attachedDepositNear),
    },
    deposit: "0", // Attach 0 NEAR to perform this action
    gas, // Pass the gas amount to the transaction
  });

  console.log("result: ", result);
  console.log("status: ", result.status);

  const sigBase64 = Buffer.from(
    (result.status as any).SuccessValue,
    "base64",
  ).toString("utf-8");
  console.log("sigBase64: ", sigBase64);
  const sigJSON = JSON.parse(sigBase64);
  console.log("sigJSON: ", sigJSON);

  // Get r, s, and recovery_id from the response
  const sigRes: any = [
    sigJSON.big_r.affine_point.slice(0, 64), // Ensure this is exactly 32 bytes (trimming if necessary)
    sigJSON.s.scalar,
    sigJSON.recovery_id,
  ];

  console.log("signature: ", sigRes);
  return sigRes;
}

export async function broadcastSignedTransaction(
  signerAccount: Account,
  actionToPerform: ActionToPerform,
  signatureResult: string[], // Signature result from the MPC
): Promise<void> {
  const { targetContractId, methodName, args, gas, attachedDepositNear } =
    actionToPerform;

  // Serialize the method arguments into a byte array (Buffer)
  const serializedArgsBuffer = Buffer.from(JSON.stringify(args));
  // Convert the Buffer directly to a Uint8Array
  const serializedArgs = new Uint8Array(serializedArgsBuffer);

  // Fetch block hash (block that the transaction will be tied to)
  const provider = signerAccount.connection.provider;
  const block = await provider.block({ finality: "final" });
  const blockHash = block.header.hash;

  // Fetch the current nonce for the account's public key
  const accessKeys = await signerAccount.getAccessKeys();
  const accessKeyForSigning = accessKeys[0];
  console.log("accessKeyForSigning: ", accessKeyForSigning);
  const nonce = accessKeyForSigning.access_key.nonce;

  // Build the transaction using near-api-js
  const actions: Action[] = [
    actionCreators.functionCall(
      methodName,
      serializedArgs,
      BigInt(gas),
      BigInt(parseNearAmount(attachedDepositNear)!),
    ),
  ];

  const transaction = createTransaction(
    signerAccount.accountId, // Signer account ID
    PublicKey.fromString(accessKeyForSigning.public_key), // Public key
    targetContractId, // Receiver ID
    nonce, // Incremented nonce
    actions, // Actions to be performed
    baseDecode(blockHash), // Block hash
  );
  console.log("transaction: ", transaction);

  // Step 2: Ensure the signature is 65 bytes (32 bytes `r` + 32 bytes `s` + 1 byte `recovery_id`)
  let r = Buffer.from(signatureResult[0], "hex");
  let s = Buffer.from(signatureResult[1], "hex");
  let recoveryId = Buffer.from([parseInt(signatureResult[2], 10)]); // recovery_id

  // NEAR requires the signature to be 65 bytes (32 bytes `r` + 32 bytes `s` + 1 byte `recovery_id`)
  if (r.length !== 32 || s.length !== 32) {
    throw new Error("Invalid signature component length");
  }

  // Combine `r`, `s`, and `recovery_id` into a single 65-byte signature
  const combinedSignature = Buffer.concat([r, s, recoveryId]);

  console.log("combinedSignature: ", combinedSignature);

  // Create the SignedTransaction object
  const signedTransaction = new SignedTransaction({
    transaction,
    signature: new Signature({
      keyType: transaction.publicKey.keyType,
      data: combinedSignature, // This is the 65-byte signature (r + s + recovery_id)
    }),
  });

  // Step 3: Broadcast the signed transaction to NEAR
  const result = await provider.sendTransaction(signedTransaction);
  console.log("Transaction result:", result);
}
