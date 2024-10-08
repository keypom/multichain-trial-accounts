// activateTrial.ts

import { KeyPair, KeyPairString } from "@near-js/crypto";
import { Near } from "@near-js/wallet-account";
import { Config } from "./types";
import { sendTransaction } from "./nearUtils";

interface ActivateTrialAccountsParams {
  near: Near;
  config: Config;
  contractAccountId: string;
  trialAccountIds: string[];
  trialAccountSecretKeys: KeyPairString[];
}

/**
 * Activates trial accounts on the trial contract.
 *
 * @param params - The parameters required to activate trial accounts.
 * @returns A Promise that resolves when all accounts are activated.
 * @throws Will throw an error if activation of any trial account fails.
 */
export async function activateTrialAccounts(
  params: ActivateTrialAccountsParams,
): Promise<void> {
  const {
    contractAccountId,
    trialAccountIds,
    near,
    config,
    trialAccountSecretKeys,
  } = params;

  console.log("Activating trial accounts...");

  for (let i = 0; i < trialAccountIds.length; i++) {
    const trialAccountId = trialAccountIds[i];
    const trialKey = trialAccountSecretKeys[i];
    console.log(`Activating trial account: ${trialAccountId}`);

    // Set the trial key in the keyStore
    const keyStore: any = (near.connection.signer as any).keyStore;
    await keyStore.setKey(
      config.networkId,
      contractAccountId,
      KeyPair.fromString(trialKey),
    );
    const signerAccount = await near.account(contractAccountId);

    const result = await sendTransaction({
      signerAccount,
      receiverId: contractAccountId,
      methodName: "activate_trial",
      args: {
        new_account_id: trialAccountId,
      },
      deposit: "0",
      gas: "300000000000000",
    });

    if (result) {
      console.log(`Trial account ${trialAccountId} activated.`);
    } else {
      throw new Error(`Failed to activate trial account: ${trialAccountId}`);
    }
  }
}
