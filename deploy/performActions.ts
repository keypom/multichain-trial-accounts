// src/performActions.ts

import {
  initNear,
  performActions as performActionsFunction,
  TrialDataFile,
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

  // Iterate over each trial account to perform actions
  for (const trialKey of trialKeys) {
    const {
      trialAccountId,
      trialAccountSecretKey,
      mpcKey,
      trialAccountPublicKey,
    } = trialKey;
    console.log(`Performing actions for account: ${trialAccountId}`);

    // Perform actions and get signatures, nonces, and block hash
    const { signatures, nonces, blockHash } = await performActionsFunction({
      config,
      near,
      trialAccountId,
      trialAccountSecretKey,
      contractAccountId: trialContractId,
      actionsToPerform,
    });

    accountSignatures[trialAccountId] = {
      signatures,
      nonces,
      blockHash,
      mpcPublicKey: mpcKey,
      trialAccountPublicKey,
    };
  }

  // Write signatures mapping to file
  const signaturesFilePath = path.join(config.dataDir, `signatures.json`);
  fs.writeFileSync(
    signaturesFilePath,
    JSON.stringify(accountSignatures, null, 2),
  );
  console.log(`Signatures written to ${signaturesFilePath}`);
}

performActions().catch((error) => {
  console.error("Error in performActions:", error);
});
