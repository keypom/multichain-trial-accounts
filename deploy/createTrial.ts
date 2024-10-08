// src/createTrials.ts

import {
  deployTrialContract,
  createTrial,
  addTrialAccounts,
  activateTrialAccounts,
  initNear,
  TrialKey,
} from "./src/index";

import fs from "fs";
import path from "path";
import { config, trialData } from "./config";

async function createTrials() {
  console.log("Initializing NEAR connection...");
  const near = await initNear(config);
  const signerAccount = await near.account(config.signerAccountId);

  // Deploy contract if needed
  const trialContractId = `${Date.now().toString()}-trial-contract.testnet`;
  console.log(`Deploying trial contract with ID: ${trialContractId}`);
  await deployTrialContract({
    near,
    config,
    signerAccount,
    contractAccountId: trialContractId,
    mpcContractId: config.mpcContractId,
    wasmFilePath: "./out/trials.wasm",
    initialBalance: "50", // Adjust as needed
  });

  // Create a trial
  console.log("Creating a trial...");
  const trialId = await createTrial({
    signerAccount,
    contractAccountId: trialContractId,
    trialData,
  });
  console.log(`Trial created with ID: ${trialId}`);

  // Add trial accounts
  console.log("Adding trial accounts...");
  const trialKeys: TrialKey[] = await addTrialAccounts({
    signerAccount,
    config,
    contractAccountId: trialContractId,
    trialId,
    numberOfKeys: config.numberOfKeys,
    dataDir: config.dataDir,
  });
  console.log(`Added ${trialKeys.length} trial accounts.`);

  // Activate trial accounts
  const trialAccountIds = trialKeys.map((tk) => tk.trialAccountId);
  const trialAccountSecretKeys = trialKeys.map(
    (tk) => tk.trialAccountSecretKey,
  );

  console.log("Activating trial accounts...");
  await activateTrialAccounts({
    config,
    near,
    trialAccountSecretKeys,
    contractAccountId: trialContractId,
    trialAccountIds,
  });
  console.log("Trial accounts activated.");

  // Prepare trial data to write to file
  const trialDataToWrite = {
    trialId,
    trialContractId,
    trialKeys,
  };

  // Write trial data to a file
  const trialDataFilePath = path.join(config.dataDir, `trialData.json`);
  fs.writeFileSync(
    trialDataFilePath,
    JSON.stringify(trialDataToWrite, null, 2),
  );
  console.log(`Trial data written to ${trialDataFilePath}`);
}

createTrials().catch((error) => {
  console.error("Error in createTrials:", error);
});
