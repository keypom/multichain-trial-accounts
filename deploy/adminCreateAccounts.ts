import { sendTransaction } from "./utils";

const { KeyPair, utils } = require("near-api-js");

export const adminCreateAccount = async ({
  signerAccount,
  factoryAccountId,
  newAccountName,
  startingNearBalance,
  startingTokenBalance,
  accountType,
}: {
  signerAccount: any;
  factoryAccountId: string;
  newAccountName: string;
  startingNearBalance: string;
  startingTokenBalance: string;
  accountType: string;
}) => {
  const keyPair = KeyPair.fromRandom("ed25519");

  await sendTransaction({
    signerAccount,
    receiverId: factoryAccountId,
    methodName: "admin_create_account",
    args: {
      new_account_id: `${newAccountName}.${factoryAccountId}`,
      new_public_key: keyPair.publicKey.toString(),
      ticket_data: {
        starting_near_balance:
          utils.format.parseNearAmount(startingNearBalance),
        starting_token_balance:
          utils.format.parseNearAmount(startingTokenBalance),
        account_type: accountType,
      },
    },
    deposit: "0",
    gas: "300000000000000",
  });

  return {
    accountId: `${newAccountName}.${factoryAccountId}`,
    secretKey: keyPair.toString(),
    keyPair,
  };
};
