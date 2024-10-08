// src/performActions.ts

import {
  initNear,
  performActions as performActionsFunction,
  TrialDataFile,
  retryAsync,
} from "./src/index";
import fs from "fs";
import path from "path";
import { config, actionsToPerform } from "./config";

async function performActions() {
  console.log("Initializing NEAR connection...");
  const near = await initNear(config);

  const trialDataFilePath = path.join(config.dataDir, `trialData.json`);

  if (!fs.existsSync(trialDataFilePath)) {
    console.error(`Trial data file not found: ${trialDataFilePath}`);
    return;
  }

  // Read trial data from file
  const trialDataContent: TrialDataFile = JSON.parse(
    fs.readFileSync(trialDataFilePath, "utf-8"),
  );

  const { trialContractId, trialKeys } = trialDataContent;

  // Initialize an object to store signatures, nonces, and block hashes
  const accountSignatures: { [accountId: string]: any } = {};

  // Configuration for retry logic
  const MAX_RETRIES = 10;
  const INITIAL_DELAY_MS = 2000; // 2 second
  const BACKOFF_FACTOR = 2; // Exponential backoff factor

  // Iterate over each trial account to perform actions
  for (const trialKey of trialKeys) {
    const {
      trialAccountId,
      trialAccountSecretKey,
      mpcKey,
      trialAccountPublicKey,
    } = trialKey;
    console.log(`\nPerforming actions for account: ${trialAccountId}`);

    try {
      // Wrap performActionsFunction with retry logic
      const { signatures, nonces, blockHash }: any = await retryAsync(
        () =>
          performActionsFunction({
            config,
            near,
            trialAccountId,
            trialAccountSecretKey,
            contractAccountId: trialContractId,
            actionsToPerform,
          }),
        MAX_RETRIES,
        INITIAL_DELAY_MS,
        BACKOFF_FACTOR,
      );

      accountSignatures[trialAccountId] = {
        signatures,
        nonces,
        blockHash,
        mpcPublicKey: mpcKey,
        trialAccountPublicKey,
      };

      console.log(`✅ Actions performed successfully for ${trialAccountId}`);
    } catch (error: any) {
      console.error(
        `❌ Failed to perform actions for account ${trialAccountId} after ${MAX_RETRIES} attempts.`,
        `Error: ${error.message || error}`,
      );
      // Optionally, you can decide to continue or halt based on the failure
      // For now, we'll continue with the next account
      continue;
    }
  }

  // Write signatures mapping to file
  const signaturesFilePath = path.join(config.dataDir, `signatures.json`);
  fs.writeFileSync(
    signaturesFilePath,
    JSON.stringify(accountSignatures, null, 2),
  );
  console.log(`\n📄 Signatures written to ${signaturesFilePath}`);
}

// Execute the performActions function and handle any unexpected errors
performActions().catch((error) => {
  console.error("⚠️ Error in performActions:", error);
});
