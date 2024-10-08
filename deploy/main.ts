// main.ts

import {
  deployTrialContract,
  createTrial,
  addTrialAccounts,
  activateTrialAccounts,
  performActions,
  initNear,
} from "./src/index";

import fs from "fs";
import path from "path";
import { config, trialData, actionsToPerform } from "./config";

async function main() {
  console.log("Deploying trial contract...");
  const near = await initNear(config);
  const signerAccount = await near.account(config.signerAccountId);

  // Deploy contract if needed
  const trialContractId = `${Date.now().toString()}-trial-contract.testnet`;
  await deployTrialContract({
    near,
    config,
    signerAccount,
    contractAccountId: trialContractId,
    mpcContractId: config.mpcContractId,
    wasmFilePath: "./out/trials.wasm",
    initialBalance: "50",
  });

  // Create a trial
  const trialId = await createTrial({
    signerAccount,
    contractAccountId: trialContractId,
    trialData,
  });

  // Add trial accounts
  const trialKeys = await addTrialAccounts({
    signerAccount,
    contractAccountId: trialContractId,
    trialId,
    numberOfKeys: config.numberOfKeys,
    dataDir: config.dataDir,
  });

  // Activate trial accounts
  const trialAccountIds = trialKeys.map((tk) => tk.trialAccountId);
  const trialAccountSecretKeys = trialKeys.map(
    (tk) => tk.trialAccountSecretKey,
  );

  await activateTrialAccounts({
    config,
    near,
    trialAccountSecretKeys,
    contractAccountId: trialContractId,
    trialAccountIds,
  });

  // Perform actions and collect signatures
  const accountSignatures: { [accountId: string]: any } = {};

  for (const trialKey of trialKeys) {
    const trialAccountId = trialKey.trialAccountId;
    const trialAccountSecretKey = trialKey.trialAccountSecretKey;

    // Perform actions and get signatures, nonces, and block hash
    const { signatures, nonces, blockHash } = await performActions({
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

main().catch(console.error);
