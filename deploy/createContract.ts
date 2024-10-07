import { Account } from "@near-js/accounts";
import { Near } from "@near-js/wallet-account";
import { Config } from "./types";
import { createAccountDeployContract } from "./utils";

export async function deployTrialContract({
  near,
  signerAccount,
  contractAccountId,
  mpcContractId,
  config,
}: {
  near: Near;
  signerAccount: Account;
  config: Config;
  contractAccountId: string;
  mpcContractId: string;
}) {
  return await createAccountDeployContract({
    signerAccount,
    config,
    newAccountId: contractAccountId,
    amount: "50",
    near,
    wasmPath: "./out/trials.wasm",
    methodName: "new",
    args: {
      mpc_contract: mpcContractId,
      admin_account: signerAccount.accountId,
    },
    deposit: "0",
    gas: "300000000000000",
  });
}
