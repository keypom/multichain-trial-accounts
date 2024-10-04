import { Config } from "./types";
import { initNear, setContractFullAccessKey, updateConfigFile } from "./utils";
import fs from "fs";
import path from "path";
import { deployTrialContract } from "./createContract";
import { createTrial } from "./createTrial";
import { performAction } from "./performAction";
import { addTrialKeys } from "./addTrialKeys";
import { activateTrial } from "./activateTrial";
import { KeyPair } from "near-api-js";
import { ACTION_PERFORMED } from "./dev/config";

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

const writeKeysToFile = (keys: KeyPair[], trialId: number, dataDir: string) => {
  const filePath = path.join(dataDir, `trial_keys_${trialId}.csv`);
  const keyData = keys
    .map((kp) => `${kp.getPublicKey().toString()},${kp.toString()}`)
    .join("\n");
  fs.writeFileSync(filePath, keyData);
  console.log(`Trial keys saved to ${filePath}`);
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
      );

      // Write keys to file
      writeKeysToFile(keyPairs, trialId, dataDir);
      console.log(`Trial keys added: ${keyPairs.length} keys`);
    }

    // Step 4: Activate trial accounts (if applicable)
    if (CREATION_CONFIG.premadeTrialAccounts) {
      const premadeAccounts = [Date.now().toString() + "-premade-1"];

      // Read the trial keys from the file
      const trialKeysPath = path.join(dataDir, `trial_keys_${trialId}.csv`);
      if (!fs.existsSync(trialKeysPath)) {
        throw new Error(`Trial keys file not found: ${trialKeysPath}`);
      }
      const keyData = fs.readFileSync(trialKeysPath, "utf-8");
      const keys = keyData.split("\n").map((line) => {
        const [publicKey, secretKey] = line.split(",");
        return KeyPair.fromString(secretKey);
      });

      // Use the first trial key for the performAction call
      const trialKey = keys[0];
      const keyStore = near.connection.signer.keyStore;
      await keyStore.setKey(GLOBAL_NETWORK, contractAccountId, trialKey);
      signerAccount = await near.account(contractAccountId);

      for (const accountId of premadeAccounts) {
        await activateTrial(signerAccount, contractAccountId, accountId);
        console.log(`Activated trial account: ${accountId}`);
      }
    }
  }

  // Step 5: Perform action using one of the trial keys
  if (CREATION_CONFIG.performAction && trialId) {
    const trialKeysPath = path.join(dataDir, `trial_keys_${trialId}.csv`);
    if (!fs.existsSync(trialKeysPath)) {
      throw new Error(`Trial keys file not found: ${trialKeysPath}`);
    }

    // Read the trial keys from the file
    const keyData = fs.readFileSync(trialKeysPath, "utf-8");
    const keys = keyData.split("\n").map((line) => {
      const [publicKey, secretKey] = line.split(",");
      return KeyPair.fromString(secretKey);
    });

    // Use the first trial key for the performAction call
    const trialKey = keys[0];
    const keyStore = near.connection.signer.keyStore;
    await keyStore.setKey(GLOBAL_NETWORK, contractAccountId, trialKey);
    signerAccount = await near.account(contractAccountId);

    // Perform action with the trial key
    await performAction(
      signerAccount, // This will now use the trial key for signing
      contractAccountId,
      ACTION_PERFORMED,
    );

    console.log("Action performed successfully with trial key");
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
