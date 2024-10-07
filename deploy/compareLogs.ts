import fs from "fs";
import path from "path";
import bs58 from "bs58";
import { parseNearAmount } from "@near-js/utils";

function compareLogs() {
  // Read the contract logs
  const contractLogsPath = path.join("data", "contract_logs.json");
  const contractLogs = JSON.parse(fs.readFileSync(contractLogsPath, "utf-8"));

  // Read the broadcast logs
  const broadcastLogsPath = path.join("data", "broadcast_logs.json");
  const broadcastLogs = JSON.parse(fs.readFileSync(broadcastLogsPath, "utf-8"));

  // Assuming only one log for simplicity; adjust as needed
  const contractLog = contractLogs[0];
  const jsLog = broadcastLogs;

  // Compare Signer Account
  if (contractLog.Signer !== jsLog.signerAccount) {
    console.log(
      `Signer mismatch! Contract: ${contractLog.Signer}, JS: ${jsLog.signerAccount}`,
    );
  } else {
    console.log("Signer accounts match.");
  }

  // Compare Target Contract
  if (contractLog.Contract !== jsLog.targetContract) {
    console.log(
      `Contract mismatch! Contract: ${contractLog.Contract}, JS: ${jsLog.targetContract}`,
    );
  } else {
    console.log("Target contracts match.");
  }

  // Compare Method Name
  if (contractLog.Method !== jsLog.methodName) {
    console.log(
      `Method name mismatch! Contract: ${contractLog.Method}, JS: ${jsLog.methodName}`,
    );
  } else {
    console.log("Method names match.");
  }

  // Compare Arguments
  const argsMatch = compareUint8Arrays(contractLog.Args, jsLog.args);
  if (!argsMatch) {
    console.log("Arguments mismatch!");
    console.log("Contract args:", contractLog.Args);
    console.log("JS args:", jsLog.args);
  } else {
    console.log("Arguments match.");
  }

  // Compare Gas
  if (contractLog.Gas !== jsLog.gas) {
    console.log(`Gas mismatch! Contract: ${contractLog.Gas}, JS: ${jsLog.gas}`);
  } else {
    console.log("Gas values match.");
  }

  // Compare Deposit
  if (contractLog.Deposit !== parseNearAmount(jsLog.deposit)) {
    console.log(
      `Deposit mismatch! Contract: ${contractLog.Deposit}, JS: ${parseNearAmount(jsLog.deposit)}`,
    );
  } else {
    console.log("Deposit values match.");
  }

  // Compare Public Keys
  const contractPublicKeyData = contractLog["Public Key"].data;
  const jsPublicKeyDecoded = bs58.decode(
    jsLog.publicKey.replace("ed25519:", ""),
  );
  const pkMatch = compareUint8Arrays(contractPublicKeyData, jsPublicKeyDecoded);
  if (!pkMatch) {
    console.log("Public Key mismatch!");
    console.log("Contract Public Key:", contractPublicKeyData);
    console.log("JS Public Key:", Array.from(jsPublicKeyDecoded));
  } else {
    console.log("Public keys match.");
  }

  // Compare MPC Public Keys
  if (contractLog["MPC Key"] && jsLog.mpcPublicKey) {
    const contractMpcKeyData = contractLog["MPC Key"].data;
    const jsMpcKeyDecoded = bs58.decode(
      jsLog.mpcPublicKey.replace("secp256k1:", ""),
    );
    const mpcPkMatch = compareUint8Arrays(contractMpcKeyData, jsMpcKeyDecoded);
    if (!mpcPkMatch) {
      console.log("MPC Public Key mismatch!");
      console.log("Contract MPC Public Key:", contractMpcKeyData);
      console.log("JS MPC Public Key:", Array.from(jsMpcKeyDecoded));
    } else {
      console.log("MPC public keys match.");
    }
  } else {
    console.log("MPC Public Key missing in logs.");
  }

  // Compare Nonce
  if (contractLog.Nonce !== jsLog.nonce) {
    console.log(
      `Nonce mismatch! Contract: ${contractLog.Nonce}, JS: ${jsLog.nonce}`,
    );
  } else {
    console.log("Nonce values match.");
  }

  // Compare Block Hash
  const contractBlockHash = contractLog["Block Hash"];
  const jsBlockHashDecoded = bs58.decode(jsLog.blockHash);
  const blockHashMatch = compareUint8Arrays(
    contractBlockHash,
    jsBlockHashDecoded,
  );
  if (!blockHashMatch) {
    console.log("Block Hash mismatch!");
    console.log("Contract Block Hash:", contractBlockHash);
    console.log("JS Block Hash:", Array.from(jsBlockHashDecoded));
  } else {
    console.log("Block hashes match.");
  }

  // Compare Actions
  // Since Actions can be complex, you might need to parse and compare specific fields
  console.log("Comparing Actions...");
  // Compare Actions
  if (contractLog.Actions.length !== jsLog.actions.length) {
    console.log(
      `Number of actions mismatch! Contract: ${contractLog.Actions.length}, JS: ${jsLog.actions.length}`,
    );
  } else {
    console.log("Number of actions match.");
    for (let i = 0; i < contractLog.Actions.length; i++) {
      const contractAction = contractLog.Actions[i];
      const jsAction = jsLog.actions[i];

      // Compare method names
      if (contractAction.methodName !== jsAction.methodName) {
        console.log(
          `Action ${i} method name mismatch! Contract: ${contractAction.methodName}, JS: ${jsAction.methodName}`,
        );
      } else {
        console.log(`Action ${i} method names match.`);
      }

      // Compare arguments
      const argsMatch = compareUint8Arrays(contractAction.args, jsAction.args);
      if (!argsMatch) {
        console.log(`Action ${i} arguments mismatch!`);
      } else {
        console.log(`Action ${i} arguments match.`);
      }

      // Compare gas
      if (contractAction.gas !== jsAction.gas) {
        console.log(
          `Action ${i} gas mismatch! Contract: ${contractAction.gas}, JS: ${jsAction.gas}`,
        );
      } else {
        console.log(`Action ${i} gas values match.`);
      }

      // Compare deposit
      if (contractAction.deposit !== jsAction.deposit) {
        console.log(
          `Action ${i} deposit mismatch! Contract: ${contractAction.deposit}, JS: ${jsAction.deposit}`,
        );
      } else {
        console.log(`Action ${i} deposit values match.`);
      }
    }
  }

  console.log("Comparison complete.");
}

// Helper function to compare two arrays of numbers
function compareUint8Arrays(
  arr1: number[],
  arr2: Uint8Array | number[],
): boolean {
  if (arr1.length !== arr2.length) {
    console.log(`Array lengths differ: ${arr1.length} vs ${arr2.length}`);
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      console.log(
        `Array elements differ at index ${i}: ${arr1[i]} vs ${arr2[i]}`,
      );
      return false;
    }
  }
  return true;
}

// Run the comparison
compareLogs();
