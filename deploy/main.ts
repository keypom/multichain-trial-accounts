import { Config } from "./types";
import {
  initNear,
  readKeysFromFile,
  readSignatureFromFile,
  setContractFullAccessKey,
  updateConfigFile,
  writeKeysToFile,
  writeSignatureToFile,
} from "./utils";
import fs from "fs";
import path from "path";
import { deployTrialContract } from "./createContract";
import { createTrial } from "./createTrial";
import { broadcastSignedTransaction, performAction } from "./performAction";
import { addTrialKeys } from "./addTrialKeys";
import { activateTrial } from "./activateTrial";
import { ACTION_PERFORMED } from "./dev/config";
import { KeyPair, KeyPairString } from "@near-js/crypto";

// Get the environment (dev or prod) from the command-line arguments
const env = process.argv[2] || "dev"; // Default to "dev" if no argument is provided

// Helper function to dynamically load the config
const loadConfig = async (env: string) => {
  console.log(`Loading config for ${env}`);
  const config: Config = await import(`./${env}/config`);

  return {
    config,
  };
};

const main = async () => {
  const { config } = await loadConfig(env);

  const {
    GLOBAL_NETWORK,
    SIGNER_ACCOUNT,
    EXISTING_TRIAL_CONTRACT,
    NUM_TRIAL_KEYS,
    CREATION_CONFIG,
    MPC_CONTRACT,
    TRIAL_DATA,
  } = config;

  const near = await initNear(config);
  console.log("Connected to Near: ", near);

  let signerAccount = await near.account(SIGNER_ACCOUNT);
  let contractKey: string | undefined = undefined;

  // Ensure the "data" directory exists, create it if it doesn't
  const dataDir = path.join(__dirname, env, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let contractAccountId = EXISTING_TRIAL_CONTRACT;

  // If `broadcastOnly` is set in the config, get the first trial key and set it as the signer account
  if (CREATION_CONFIG.broadcastOnly) {
    console.log("Broadcasting saved signature...");

    // Step 1: Read the trial keys from the file (assuming trialId is known or can be fetched from config)
    const trialId = 1;
    const keysMapping = readKeysFromFile(dataDir, trialId);
    const accountId = Object.keys(keysMapping)[0];
    const firstTrialKey = keysMapping[accountId];

    if (!firstTrialKey) {
      throw new Error("No trial keys found to use for broadcasting.");
    }

    // Step 2: Set the signer account to the trial account using the first trial key
    signerAccount = await near.account(accountId); // Now use the trial account for signing

    // Step 3: Read the saved signature from the file
    const sigRes = readSignatureFromFile(dataDir);

    // Step 4: Broadcast the transaction using the trial key account
    await broadcastSignedTransaction(signerAccount, ACTION_PERFORMED, sigRes);

    console.log("Broadcast complete using trial account.");
    return;
  }

  // Step 1: Deploy Contract (if required)
  if (CREATION_CONFIG.deployContract) {
    contractAccountId = `${Date.now().toString()}-trial-contract.${GLOBAL_NETWORK === "testnet" ? "testnet" : "near"}`;
    contractKey = await deployTrialContract({
      near,
      config,
      signerAccount,
      contractAccountId,
      mpcContractId: MPC_CONTRACT,
    });

    const csvFilePath = path.join(dataDir, "contractKey.csv");
    fs.writeFileSync(csvFilePath, `${contractAccountId},${contractKey}`);

    updateConfigFile(contractAccountId, env);
  }

  // Step 2: Create a new trial
  let trialId: number | undefined = undefined;
  if (CREATION_CONFIG.createNewTrial) {
    trialId = await createTrial(signerAccount, contractAccountId, TRIAL_DATA);
    console.log(`Trial created with ID: ${trialId}`);

    // Step 3: Add trial keys (if applicable)
    if (CREATION_CONFIG.addTrialAccounts && trialId) {
      console.log(`Adding ${NUM_TRIAL_KEYS} trial keys...`);
      const keyPairs = await addTrialKeys(
        signerAccount,
        contractAccountId,
        trialId,
        NUM_TRIAL_KEYS,
        dataDir,
      );
      console.log(`Trial keys added: ${keyPairs.length} keys`);
    }

    // Step 4: Activate trial accounts (if applicable)
    if (CREATION_CONFIG.premadeTrialAccounts) {
      // Read the keys file to get the trial account IDs and corresponding key data
      const trialKeysMapping = readKeysFromFile(dataDir, trialId);
      console.log("Trial keys mapping:", trialKeysMapping);

      // Get the list of trial account IDs (keys from the mapping)
      const trialAccountIds = Object.keys(trialKeysMapping);

      // Use the first trial account for the performAction call
      const firstTrialAccountId = trialAccountIds[0];
      const trialKeyData = trialKeysMapping[firstTrialAccountId];
      const trialKey = trialKeyData.secretKey;

      const keyStore: any = (near.connection.signer as any).keyStore;
      await keyStore.setKey(
        GLOBAL_NETWORK,
        contractAccountId,
        KeyPair.fromString(trialKey as KeyPairString),
      );
      signerAccount = await near.account(contractAccountId);

      // Activate all premade accounts
      for (const accountId of trialAccountIds) {
        await activateTrial(signerAccount, contractAccountId, accountId);
        console.log(`Activated trial account: ${accountId}`);
      }
    }

    // Step 5: Perform action using one of the trial keys
    if (CREATION_CONFIG.performAction && trialId) {
      // Read the keys file to get the trial account IDs and corresponding key data
      const trialKeysMapping = readKeysFromFile(dataDir, trialId);
      console.log("Trial keys mapping:", trialKeysMapping);

      // Get the list of trial account IDs (keys from the mapping)
      const trialAccountIds = Object.keys(trialKeysMapping);

      // Use the first trial account for the performAction call
      const firstTrialAccountId = trialAccountIds[0];
      const trialKeyData = trialKeysMapping[firstTrialAccountId];
      const trialKey = trialKeyData.secretKey;

      const keyStore: any = (near.connection.signer as any).keyStore;
      await keyStore.setKey(
        GLOBAL_NETWORK,
        contractAccountId,
        KeyPair.fromString(trialKey as KeyPairString),
      );
      signerAccount = await near.account(contractAccountId);

      // Perform action with the trial key
      const sigRes: string[] = await performAction(
        signerAccount, // This will now use the trial key for signing
        contractAccountId,
        ACTION_PERFORMED,
      );
      console.log("Signature: ", sigRes);

      // Write signature to file for future broadcasting
      writeSignatureToFile(sigRes, dataDir);

      console.log("Broadcasting saved signature...");

      // Step 2: Set the signer account to the trial account using the first trial key
      signerAccount = await near.account(firstTrialAccountId); // Now use the trial account for signing

      await broadcastSignedTransaction(signerAccount, ACTION_PERFORMED, sigRes);

      console.log("Action performed successfully with trial key");
    }
  }

  // Reset the key in the file system to be a full access key (if needed)
  if (contractKey !== undefined) {
    await setContractFullAccessKey(contractKey, contractAccountId, config);
  }

  console.log("Setup complete!");
  console.log(
    `https://${GLOBAL_NETWORK}.nearblocks.io/address/${contractAccountId}`,
  );
};

main().catch(console.error);
