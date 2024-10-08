// compareLogs.ts

import fs from "fs";
import path from "path";
import bs58 from "bs58";
import { parseNearAmount } from "@near-js/utils";
import { compareAndLog, logError, logInfo, logSuccess } from "./src/logUtils";

/**
 * Compares contract logs with broadcast logs and logs the results.
 */
function compareLogs() {
  logInfo("Starting log comparison...\n");

  // Read the contract logs
  const contractLogsPath = path.join("data", "contract_logs.json");
  const contractLogs = JSON.parse(fs.readFileSync(contractLogsPath, "utf-8"));

  // Read the broadcast logs
  const broadcastLogsPath = path.join("data", "broadcast_logs.json");
  const broadcastLogs = JSON.parse(fs.readFileSync(broadcastLogsPath, "utf-8"));

  // Assuming only one log for simplicity; adjust as needed
  const contractLog = contractLogs[0];
  const jsLog = broadcastLogs;

  logInfo("Comparing Signer Account...");
  compareAndLog("Signer Account", contractLog.Signer, jsLog.signerAccount);

  logInfo("\nComparing Target Contract...");
  compareAndLog("Target Contract", contractLog.Contract, jsLog.targetContract);

  logInfo("\nComparing Method Name...");
  compareAndLog("Method Name", contractLog.Method, jsLog.methodName);

  logInfo("\nComparing Arguments...");
  compareAndLog("Arguments", contractLog.Args, jsLog.args);

  logInfo("\nComparing Gas...");
  compareAndLog("Gas", contractLog.Gas, jsLog.gas);

  logInfo("\nComparing Deposit...");
  compareAndLog(
    "Deposit",
    contractLog.Deposit,
    parseNearAmount(jsLog.deposit) || jsLog.deposit,
  );

  logInfo("\nComparing Public Keys...");
  const contractPublicKeyData = contractLog["Public Key"].data;
  const jsPublicKeyDecoded = bs58.decode(
    jsLog.publicKey.replace("ed25519:", ""),
  );
  compareAndLog(
    "Public Key",
    contractPublicKeyData,
    Array.from(jsPublicKeyDecoded),
  );

  logInfo("\nComparing MPC Public Keys...");
  if (contractLog["MPC Key"] && jsLog.mpcPublicKey) {
    const contractMpcKeyData = contractLog["MPC Key"].data;
    const jsMpcKeyDecoded = bs58.decode(
      jsLog.mpcPublicKey.replace("secp256k1:", ""),
    );
    compareAndLog(
      "MPC Public Key",
      contractMpcKeyData,
      Array.from(jsMpcKeyDecoded),
    );
  } else {
    logInfo("MPC Public Key missing in logs.");
  }

  logInfo("\nComparing Nonce...");
  compareAndLog("Nonce", contractLog.Nonce, jsLog.nonce);

  logInfo("\nComparing Block Hash...");
  const contractBlockHash = contractLog["Block Hash"];
  const jsBlockHashDecoded = bs58.decode(jsLog.blockHash);
  compareAndLog(
    "Block Hash",
    contractBlockHash,
    Array.from(jsBlockHashDecoded),
  );

  logInfo("\nComparing TxHash...");
  if (contractLog["TxHash"] && jsLog.txHash) {
    const contractTxHashArray = contractLog["TxHash"];
    const jsTxHashHex = jsLog.txHash; // Assuming jsLog.txHash is a hex string

    compareAndLog("TxHash", contractTxHashArray, jsTxHashHex, undefined);
  } else {
    logInfo("TxHash missing in logs.");
  }

  logInfo("\nComparing Actions...");
  compareActions(contractLog.Actions, jsLog.actions);

  logInfo("\nLog comparison complete.");
}

/**
 * Compares actions from contract logs with broadcast logs.
 * @param contractActions - Array of actions from contract logs.
 * @param jsActions - Array of actions from broadcast logs.
 */
function compareActions(contractActions: any[], jsActions: any[]) {
  if (contractActions.length !== jsActions.length) {
    logError(
      `Number of actions mismatch! Contract: ${contractActions.length}, JS: ${jsActions.length}`,
    );
    return;
  }

  logSuccess(`Number of actions match: ${contractActions.length}`);

  for (let i = 0; i < contractActions.length; i++) {
    const contractAction = contractActions[i];
    const jsAction = jsActions[i];

    logInfo(`\nComparing Action ${i + 1} Method Name...`);
    compareAndLog(
      `Action ${i + 1} Method Name`,
      contractAction.methodName,
      jsAction.methodName,
    );

    logInfo(`Comparing Action ${i + 1} Arguments...`);
    compareAndLog(
      `Action ${i + 1} Arguments`,
      contractAction.args,
      jsAction.args,
    );

    logInfo(`Comparing Action ${i + 1} Gas...`);
    compareAndLog(`Action ${i + 1} Gas`, contractAction.gas, jsAction.gas);

    logInfo(`Comparing Action ${i + 1} Deposit...`);
    compareAndLog(
      `Action ${i + 1} Deposit`,
      contractAction.deposit,
      jsAction.deposit,
    );
  }
}

// Run the comparison
compareLogs();
