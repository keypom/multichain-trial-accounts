import { Config, KeyData } from "./types";
import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";
import { KeyPair, KeyPairString } from "@near-js/crypto";
import {
  Action,
  actionCreators,
  DeployContract,
  FunctionCall,
} from "@near-js/transactions";
import { parseNearAmount } from "@near-js/utils";
import { Near } from "@near-js/wallet-account";
import { Account } from "@near-js/accounts";

const fs = require("fs");
const path = require("path");
const homedir = require("os").homedir();

const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
const keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);

export const writeSignatureToFile = (signature: string[], dataDir: string) => {
  const filePath = path.join(dataDir, "signature.json");
  fs.writeFileSync(filePath, JSON.stringify(signature, null, 2));
  console.log(`Signature saved to ${filePath}`);
};

export const readSignatureFromFile = (dataDir: string): string[] => {
  const filePath = path.join(dataDir, "signature.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Signature file not found: ${filePath}`);
  }
  const signatureData = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(signatureData);
};

export function writeKeysToFile(
  trialAccountIds: string[],
  keyPairs: KeyPair[],
  trialId: number,
  mpcKeys: string[],
  dataDir: string,
) {
  const filePath = path.join(dataDir, `trial-${trialId}-keys.csv`);

  // Map the trial account ID to its corresponding key data and write it to the file
  const fileContent = trialAccountIds
    .map((trialAccountId, index) => {
      const publicKey = keyPairs[index].getPublicKey().toString();
      const privateKey = keyPairs[index].toString();
      const mpcKey = mpcKeys[index];
      return `${trialAccountId},${publicKey},${privateKey},${trialId},${mpcKey}`;
    })
    .join("\n");

  fs.writeFileSync(filePath, fileContent, { encoding: "utf8" });
  console.log(`Keys written to file: ${filePath}`);
}

export const readKeysFromFile = (
  dataDir: string,
  trialId: number,
): Record<string, KeyData> => {
  // Ensure the file path matches the one used in writeKeysToFile
  const trialKeysPath = path.join(dataDir, `trial-${trialId}-keys.csv`);
  if (!fs.existsSync(trialKeysPath)) {
    throw new Error(`Trial keys file not found: ${trialKeysPath}`);
  }

  const keyData = fs.readFileSync(trialKeysPath, "utf-8");

  // Initialize an empty object to store the mapping
  const keysMapping: Record<string, KeyData> = {};

  keyData.split("\n").forEach((line: string) => {
    if (line.trim() === "") return; // Skip empty lines

    // Assuming CSV format: trialAccountId,publicKey,secretKey,trialId,mpcKey
    const [trialAccountId, publicKey, secretKey, trialIdStr, mpcKey] =
      line.split(",");

    // Ensure each field is present
    if (!trialAccountId || !publicKey || !secretKey || !trialIdStr || !mpcKey) {
      throw new Error("Malformed trial key data.");
    }

    // Create a KeyData object
    const keyDataObj: KeyData = {
      publicKey,
      secretKey,
      trialId: parseInt(trialIdStr, 10),
      mpcKey,
    };

    // Map the trial account ID to the key data
    keysMapping[trialAccountId] = keyDataObj;
  });

  return keysMapping;
};

export async function initNear(config: Config) {
  const nearConfig = {
    keyStore,
    networkId: config.GLOBAL_NETWORK,
    nodeUrl: `https://rpc.${config.GLOBAL_NETWORK}.near.org`,
  };
  const near = new Near({ ...nearConfig, keyStore });
  return near;
}

export async function setContractFullAccessKey(
  contractKey: string,
  contractAccountId: string,
  config: Config,
) {
  const keyPair = KeyPair.fromString(contractKey as KeyPairString);
  await keyStore.setKey(config.GLOBAL_NETWORK, contractAccountId, keyPair);
}

export async function sendTransaction({
  signerAccount,
  receiverId,
  methodName,
  args,
  deposit,
  gas,
  wasmPath = undefined,
}: {
  signerAccount: Account;
  receiverId: string;
  methodName: string;
  args: any;
  deposit: string;
  gas: string;
  wasmPath?: string;
}) {
  const serializedArgsBuffer = Buffer.from(JSON.stringify(args));
  const serializedArgs = new Uint8Array(serializedArgsBuffer);

  let actions: Action[] = [];

  if (wasmPath) {
    const contractCode = fs.readFileSync(wasmPath);
    actions.push(actionCreators.deployContract(contractCode));
  }

  actions.push(
    actionCreators.functionCall(
      methodName,
      serializedArgs,
      BigInt(gas),
      BigInt(parseNearAmount(deposit)!),
    ),
  );

  const result = await signerAccount.signAndSendTransaction({
    receiverId: receiverId,
    actions,
  });

  return result;
}

export async function createAccountDeployContract({
  signerAccount,
  newAccountId,
  amount,
  near,
  wasmPath,
  methodName,
  args,
  deposit = "0",
  config,
  gas = "300000000000000",
}: {
  signerAccount: Account;
  newAccountId: string;
  amount: string;
  near: Near;
  wasmPath: string;
  methodName: string;
  args: any;
  config: Config;
  deposit?: string;
  gas?: string;
}) {
  console.log("Creating account: ", newAccountId);
  let sk = await createAccount({
    signerAccount,
    newAccountId,
    amount,
    config,
  });
  let keyPair = KeyPair.fromString(sk);
  console.log("Deploying contract: ", newAccountId);
  const accountObj = await near.account(newAccountId);
  await sendTransaction({
    signerAccount: accountObj,
    receiverId: newAccountId,
    methodName,
    args: { ...args, contract_key: keyPair.getPublicKey().toString() },
    deposit,
    gas,
    wasmPath,
  });

  console.log("Deployed.");
  return sk;
}

export async function createAccount({
  signerAccount,
  newAccountId,
  amount,
  config,
}: {
  signerAccount: Account;
  newAccountId: string;
  amount: string;
  config: Config;
}) {
  const keyPair = KeyPair.fromRandom("ed25519");
  const publicKey = keyPair.getPublicKey().toString();
  await keyStore.setKey(config.GLOBAL_NETWORK, newAccountId, keyPair);

  await signerAccount.functionCall({
    contractId: config.GLOBAL_NETWORK === "testnet" ? "testnet" : "near",
    methodName: "create_account",
    args: {
      new_account_id: newAccountId,
      new_public_key: publicKey,
    },
    gas: BigInt("300000000000000"),
    attachedDeposit: BigInt(parseNearAmount(amount)!),
  });
  return keyPair.toString();
}

// Helper function to update the EXISTING_FACTORY in config.ts dynamically
export const updateConfigFile = (
  newContractId: string,
  environment: string,
) => {
  // Determine the config file path based on the environment
  const configFilePath = path.join(__dirname, environment, "config.ts");

  // Check if the config file exists
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Config file not found: ${configFilePath}`);
  }

  // Read the current content of the config file
  const configContent = fs.readFileSync(configFilePath, "utf-8");

  // Replace the EXISTING_FACTORY value
  const updatedContent = configContent.replace(
    /export const EXISTING_TRIAL_CONTRACT = `.*?`;/,
    `export const EXISTING_TRIAL_CONTRACT = \`${newContractId}\`;`,
  );

  // Write the updated content back to the correct config file
  fs.writeFileSync(configFilePath, updatedContent);
  console.log(
    `Updated ${environment}/config.ts with new contract ID: ${newContractId}`,
  );
};
