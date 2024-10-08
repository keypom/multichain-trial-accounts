// performAction.ts

import { Account } from "@near-js/accounts";
import { sendTransaction } from "./utils";
import { ActionToPerform, Config, TrialData } from "./types";
import fs from "fs";
import path from "path";
import { parseNearAmount } from "@near-js/utils";
import { KeyPair, KeyPairString, KeyType, PublicKey } from "@near-js/crypto";
import {
  Action,
  actionCreators,
  createTransaction,
  Signature,
  SignedTransaction,
} from "@near-js/transactions";
import { Near } from "@near-js/wallet-account";
import { ec as EC } from "elliptic";

import { sha256 } from "js-sha256";
import * as crypto from "crypto";
import bs58 from "bs58";

interface PerformActionsParams {
  near: Near;
  config: Config;
  trialAccountId: string;
  trialAccountSecretKey: KeyPairString;
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
    KeyPair.fromString(trialAccountSecretKey),
  );
  let signerAccount = await near.account(trialAccountId);

  const signatures: string[][] = [];
  const nonces: string[] = [];
  const contractLogs: string[] = [];

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

    // Extract logs from the transaction result
    const logs = extractLogsFromResult(result);

    // Find the specific log we're interested in
    const relevantLog = logs.find((log) => log.startsWith("Signer:"));
    if (relevantLog) {
      // Parse the log
      const parsedLog = parseContractLog(relevantLog);
      contractLogs.push(parsedLog);
    } else {
      console.error("Relevant log not found in the transaction result.");
    }

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

  // Write the contract logs to a file for later comparison
  const logsFilePath = path.join(config.dataDir, `contract_logs.json`);
  fs.writeFileSync(logsFilePath, JSON.stringify(contractLogs, null, 2));
  console.log(`Contract logs written to ${logsFilePath}`);

  return { signatures, nonces, blockHash };
}

// Helper function to extract logs from the transaction result
function extractLogsFromResult(result: any): string[] {
  const logs: string[] = [];
  for (const outcome of result.receipts_outcome) {
    logs.push(...outcome.outcome.logs);
  }
  return logs;
}

function parseContractLog(log: string): any {
  const parsedData: any = {};

  // Remove any newlines and the initial "Log [account]: " if present
  let content = log.replace(/\n/g, "").trim();

  // Adjusted regular expression to capture Actions as JSON-like string
  const regex =
    /Signer: AccountId\("(.+?)"\), Contract: AccountId\("(.+?)"\), Method: "(.+?)", Args: (\[.*?\]), Gas: NearGas \{ inner: ([0-9]+) \}, Deposit: U128\(([0-9]+)\), Public Key: PublicKey \{ data: (\[.*?\]) \}, MPC Key: PublicKey \{ data: (\[.*?\]) \}, MPC Account: AccountId\("(.+?)"\), Chain ID: (\d+), Nonce: U64\((\d+)\), Block Hash: Base58CryptoHash\((\[.*?\])\), Actions: (\[.*\])$/;

  const match = content.match(regex);

  if (match) {
    parsedData["Signer"] = match[1];
    parsedData["Contract"] = match[2];
    parsedData["Method"] = match[3];
    parsedData["Args"] = JSON.parse(match[4]);
    parsedData["Gas"] = match[5];
    parsedData["Deposit"] = match[6];
    parsedData["Public Key"] = { data: JSON.parse(match[7]) };
    parsedData["MPC Key"] = { data: JSON.parse(match[8]) };
    parsedData["MPC Account"] = match[9];
    parsedData["Chain ID"] = match[10];
    parsedData["Nonce"] = match[11];
    parsedData["Block Hash"] = JSON.parse(match[12]);
    // Parse the Actions string into an array of actions
    parsedData["Actions"] = parseActionsString(match[13]);
  } else {
    console.error("Failed to parse contract log:", log);
  }

  return parsedData;
}

// Helper function to parse the Actions string
function parseActionsString(actionsStr: string): any[] {
  // Since the Actions string is not in JSON format, we'll need to parse it manually
  // For this example, we'll extract method_name, args, gas, and deposit from FunctionCallAction
  const actions: any[] = [];

  const functionCallRegex =
    /FunctionCall\(FunctionCallAction \{ method_name: "(.*?)", args: (\[.*?\]), gas: U64\((\d+)\), deposit: U128\((\d+)\) \}\)/g;

  let match: any;
  while ((match = functionCallRegex.exec(actionsStr)) !== null) {
    actions.push({
      methodName: match[1],
      args: JSON.parse(match[2]),
      gas: match[3],
      deposit: match[4],
    });
  }

  return actions;
}

interface BroadcastTransactionParams {
  signerAccount: Account;
  actionToPerform: ActionToPerform;
  signatureResult: string[]; // Signature result from the MPC
  nonce: string;
  blockHash: string;
  mpcPublicKey: string; // Add this parameter
  trialAccountPublicKey: string;
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
  const {
    signerAccount,
    actionToPerform,
    signatureResult,
    nonce,
    blockHash,
    mpcPublicKey,
    trialAccountPublicKey,
  } = params;

  const { targetContractId, methodName, args, gas, attachedDepositNear } =
    actionToPerform;

  const serializedArgs = new Uint8Array(Buffer.from(JSON.stringify(args)));

  const provider = signerAccount.connection.provider;

  const blockHashBytes = bs58.decode(blockHash);

  const accessKeys = await signerAccount.getAccessKeys();
  const accessKeyForSigning = accessKeys.find(
    (key) => key.public_key === mpcPublicKey,
  );

  if (!accessKeyForSigning) {
    throw new Error(
      `No access key found for signing with MPC public key ${mpcPublicKey}`,
    );
  }

  const actions: Action[] = [
    actionCreators.functionCall(
      methodName,
      serializedArgs,
      BigInt(gas),
      BigInt(parseNearAmount(attachedDepositNear)!),
    ),
  ];

  // Collect the broadcast logs into an object
  const broadcastLog = {
    signerAccount: signerAccount.accountId,
    targetContract: targetContractId,
    methodName,
    args: Array.from(serializedArgs),
    gas,
    deposit: attachedDepositNear,
    publicKey: trialAccountPublicKey,
    mpcPublicKey,
    nonce,
    blockHash,
    actions: actions.map((action) => {
      if (action.functionCall) {
        return {
          methodName: action.functionCall.methodName,
          args: Array.from(action.functionCall.args),
          gas: action.functionCall.gas.toString(),
          deposit: action.functionCall.deposit.toString(),
        };
      }
      return action;
    }),
  };

  // Write the broadcast log to a file for comparison
  const logsFilePath = path.join("data", `broadcast_logs.json`);
  fs.writeFileSync(logsFilePath, JSON.stringify(broadcastLog, null, 2));
  console.log(`Broadcast logs written to ${logsFilePath}`);

  // Create the transaction
  const transaction = createTransaction(
    signerAccount.accountId,
    PublicKey.fromString(mpcPublicKey), // Use MPC public key
    targetContractId,
    nonce,
    actions,
    blockHashBytes,
  );

  // Hash the transaction to get the message to sign
  const serializedTx = transaction.encode();
  const txHash = new Uint8Array(sha256.array(serializedTx));

  // Log transaction hash
  console.log("=== Transaction Details ===");
  console.log("Transaction Hash:", Buffer.from(txHash).toString("hex"));

  // Construct the signature without recovery ID
  // Construct the signature **with** recovery ID
  const r = Buffer.from(signatureResult[0], "hex");
  const s = Buffer.from(signatureResult[1], "hex");
  let recoveryId = parseInt(signatureResult[2], 10);

  if (r.length !== 32 || s.length !== 32) {
    throw new Error("Invalid signature component length");
  }

  // Adjust recovery ID if necessary (ensure it's between 0 and 3)
  if (recoveryId >= 27) {
    recoveryId -= 27;
  }
  if (recoveryId < 0 || recoveryId > 3) {
    throw new Error(`Invalid recovery ID: ${recoveryId}`);
  }

  const combinedSignature = Buffer.concat([r, s, Buffer.from([recoveryId])]);

  const signedTransaction = new SignedTransaction({
    transaction,
    signature: new Signature({
      keyType: KeyType.SECP256K1,
      data: combinedSignature,
    }),
  });

  // Attempt to recover the public key with all possible recovery IDs
  console.log("\n=== Public Key Recovery ===");

  // Decode the expected public key from Base58
  const expectedPublicKeyBytes = bs58.decode(
    mpcPublicKey.replace("secp256k1:", ""),
  );

  console.log(
    "Expected Public Key Bytes Length:",
    expectedPublicKeyBytes.length,
  );

  // Compress the expected public key if it's uncompressed
  let expectedPublicKeyCompressedBytes = expectedPublicKeyBytes;
  if (expectedPublicKeyBytes.length === 65) {
    const ec = new EC("secp256k1");
    const expectedKeyPair = ec.keyFromPublic(expectedPublicKeyBytes);
    expectedPublicKeyCompressedBytes = Buffer.from(
      expectedKeyPair.getPublic().encode("array", true), // Compress the key
    );
    console.log(
      "Compressed Expected Public Key Bytes Length:",
      expectedPublicKeyCompressedBytes.length,
    );
  }

  // Create NEAR PublicKey object from compressed expected public key
  const expectedPublicKeyNEAR = new PublicKey({
    keyType: KeyType.SECP256K1,
    data: expectedPublicKeyCompressedBytes,
  });

  const expectedPublicKeyString = expectedPublicKeyNEAR.toString();
  console.log(
    "Expected Public Key (Compressed, NEAR format):",
    expectedPublicKeyString,
  );

  let recoveredPublicKeyString: string | null = null;

  for (let recId = 0; recId < 4; recId++) {
    try {
      const recoveredPublicKey = recoverPublicKeyFromSignature(
        txHash,
        { r, s },
        recId,
      );

      const recoveredPublicKeyBytesCompressed = Buffer.from(
        recoveredPublicKey.getPublic().encode("array", true),
      );

      // Ensure the public key length is correct
      if (recoveredPublicKeyBytesCompressed.length !== 33) {
        console.log(
          `Recovered Public Key Bytes length is incorrect with recovery ID ${recId}`,
        );
        continue;
      }

      const recoveredPublicKeyNEAR = new PublicKey({
        keyType: KeyType.SECP256K1,
        data: recoveredPublicKeyBytesCompressed,
      });

      const currentRecoveredPublicKeyString = recoveredPublicKeyNEAR.toString();

      console.log(`Recovery ID ${recId}: ${currentRecoveredPublicKeyString}`);

      if (currentRecoveredPublicKeyString === expectedPublicKeyString) {
        console.log(
          "✅ The recovered public key matches the expected public key.",
        );
        recoveredPublicKeyString = currentRecoveredPublicKeyString;
        break;
      } else {
        console.log(
          "❌ The recovered public key does NOT match the expected public key.",
        );
      }
    } catch (error: any) {
      console.error(
        `Error during public key recovery with recovery ID ${recId}:`,
        error.message,
      );
    }
  }

  if (!recoveredPublicKeyString) {
    console.log(
      "\nThe recovered public key does NOT match the expected public key with any recovery ID.",
    );
  }

  // Send the signed transaction
  console.log("\n=== Sending Transaction ===");
  try {
    const result = await provider.sendTransaction(signedTransaction);
    console.log("Transaction Result:", result);
  } catch (error) {
    console.error("Error sending transaction:", error);
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

// Helper function to recover the public key from the signature
function recoverPublicKeyFromSignature(
  msgHash: Uint8Array,
  signature: { r: Buffer; s: Buffer },
  recoveryId: number,
): EC.KeyPair {
  const ec = new EC("secp256k1");

  // Ensure recovery ID is within 0-3
  if (recoveryId < 0 || recoveryId > 3) {
    throw new Error(`Invalid recovery ID: ${recoveryId}`);
  }

  // Convert message hash to Buffer
  const msgHashBuffer = Buffer.from(msgHash);

  // Recover the public key point
  const recoveredPubPoint = ec.recoverPubKey(
    msgHashBuffer,
    { r: signature.r, s: signature.s },
    recoveryId,
  );

  // Create a KeyPair from the recovered public key point
  const recoveredKeyPair = ec.keyFromPublic(recoveredPubPoint);

  return recoveredKeyPair;
}
