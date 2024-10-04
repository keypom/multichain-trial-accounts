// cleanup.ts

import { KeyPair } from "near-api-js";

export const cleanupContract = async ({
  near,
  factoryKey,
  factoryAccountId,
  networkId,
}: {
  near: any;
  factoryAccountId: string;
  factoryKey: string | undefined;
  networkId: string;
}) => {
  if (factoryKey !== undefined) {
    let factoryKeyPair = KeyPair.fromString(factoryKey);
    let keyStore = near.connection.signer.keyStore;
    await keyStore.setKey(networkId, factoryAccountId, factoryKeyPair);
  }
  const signerAccount = await near.account(factoryAccountId);

  // Check if the contract is frozen
  const isFrozen: boolean = await signerAccount.viewFunction(
    factoryAccountId,
    "is_contract_frozen",
    {},
  );

  if (!isFrozen) {
    // Freeze the contract
    console.log("Contract is not frozen. Freezing it now...");
    await signerAccount.functionCall({
      contractId: factoryAccountId,
      methodName: "toggle_freeze",
      args: { is_freeze: true },
      gas: "300000000000000",
    });
  } else {
    console.log("Contract is already frozen.");
  }

  // Initialize variables
  let accountsLeft = 1;
  let totalBytesCleared = 0;

  // Recursively call clear_storage until all accounts are cleared
  while (accountsLeft > 0) {
    const result = await signerAccount.functionCall({
      contractId: factoryAccountId,
      methodName: "clear_storage",
      args: { limit: 10, refund_account: signerAccount.accountId },
      gas: "300000000000000",
    });

    // Get the number of accounts left from the function's return value
    accountsLeft = parseInt(
      Buffer.from(result.status.SuccessValue, "base64").toString(),
    );

    // Extract bytes cleared from logs
    const logs = result.receipts_outcome.flatMap(
      (outcome: any) => outcome.outcome.logs,
    );
    const bytesCleared = extractBytesClearedFromLogs(logs);

    totalBytesCleared += bytesCleared;

    console.log(
      `Accounts left to clear: ${accountsLeft}, Bytes cleared in this batch: ${bytesCleared}`,
    );
  }

  // Delete function call access keys from the contract account
  const accessKeys = await signerAccount.getAccessKeys();

  let keysDeleted = 0;

  for (const key of accessKeys) {
    if (key.access_key.permission !== "FullAccess") {
      // Delete function call access key
      await signerAccount.deleteKey(key.public_key);
      keysDeleted += 1;
      console.log(`Deleted function call access key: ${key.public_key}`);
    }
  }

  // Write summary file
  const summary = {
    total_bytes_cleared: totalBytesCleared,
    total_keys_deleted: keysDeleted,
  };

  return summary;
};

function extractBytesClearedFromLogs(logs: string[]): number {
  let bytesCleared = 0;
  for (const log of logs) {
    const match = log.match(/Cleared (\d+) bytes\. Refunding .*/);
    if (match) {
      bytesCleared += parseInt(match[1]);
    }
  }
  return bytesCleared;
}
