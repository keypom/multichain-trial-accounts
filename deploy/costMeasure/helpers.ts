import { Account } from "near-api-js";

// Fetches contract storage usage
export async function getContractStorageUsage(
  account: Account,
  accountId: string,
): Promise<number> {
  const accountState: any = await account.connection.provider.query({
    request_type: "view_account",
    finality: "final",
    account_id: accountId,
  });
  return accountState.storage_usage;
}

// Fetches account balance
export async function getAccountBalance(account: Account, accountId: string) {
  const accountState: any = await account.connection.provider.query({
    request_type: "view_account",
    finality: "final",
    account_id: accountId,
  });
  return accountState.amount;
}
