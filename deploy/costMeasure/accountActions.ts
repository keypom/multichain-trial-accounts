import { Account, KeyPair, utils } from "near-api-js";
import { sendTransaction } from "../utils";
import { GLOBAL_NETWORK } from "./config";

// Create conference accounts
export async function createConferenceAccounts(
  near: any,
  secretKeys: string[],
  accountIds: string[],
  factoryAccountId: string,
) {
  const keyStore = near.connection.signer.keyStore;

  for (let i = 0; i < secretKeys.length; i++) {
    const secretKey = secretKeys[i];
    const accountId = accountIds[i];

    // Switch signer to User Account
    const signerAccount = await near.account(factoryAccountId);
    const keyPair = KeyPair.fromString(secretKey);
    await keyStore.setKey(GLOBAL_NETWORK, factoryAccountId, keyPair);

    await sendTransaction({
      signerAccount,
      receiverId: factoryAccountId,
      methodName: "create_account",
      args: {
        new_account_id: accountId,
      },
      deposit: "0",
      gas: "300000000000000",
    });
  }
}

export async function sendConferenceTokens(
  signerAccount: Account,
  receiverId: string,
  amount: string,
  factoryAccountId: string,
) {
  await sendTransaction({
    signerAccount,
    receiverId: factoryAccountId,
    methodName: "ft_transfer",
    args: {
      receiver_id: receiverId,
      amount: utils.format.parseNearAmount(amount),
    },
    deposit: "0",
    gas: "300000000000000",
  });
}
