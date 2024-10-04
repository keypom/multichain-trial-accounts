const { utils } = require("near-api-js");
import { Config } from "./types";
import { createAccountDeployContract } from "./utils";

export async function deployFactory({
  near,
  signerAccount,
  adminAccounts,
  factoryAccountId,
  config,
  ticketData,
}: {
  near: any;
  signerAccount: any;
  adminAccounts: string[];
  config: Config;
  ticketData: Record<
    string,
    {
      startingNearBalance: string;
      startingTokenBalance: string;
      accountType: string;
    }
  >;
  factoryAccountId: string;
}) {
  let ticket_data: Record<string, any> = {};
  for (const [key, value] of Object.entries(ticketData)) {
    ticket_data[key] = {
      starting_near_balance: utils.format.parseNearAmount(
        value.startingNearBalance,
      ),
      starting_token_balance: utils.format.parseNearAmount(
        value.startingTokenBalance,
      ),
      account_type: value.accountType,
    };
  }

  return await createAccountDeployContract({
    signerAccount,
    config,
    newAccountId: factoryAccountId,
    amount: "200",
    near,
    wasmPath: "./out/factory.wasm",
    methodName: "new",
    args: {
      ticket_data,
      admin: adminAccounts,
    },
    deposit: "0",
    gas: "300000000000000",
  });
}
