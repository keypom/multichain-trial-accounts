import { Config } from "./types";

const {
  KeyPair,
  connect,
  utils,
  transactions,
  keyStores,
} = require("near-api-js");
const fs = require("fs");
const path = require("path");
const homedir = require("os").homedir();

const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

export async function initNear(config: Config) {
  const nearConfig = {
    keyStore,
    networkId: config.GLOBAL_NETWORK,
    nodeUrl: `https://rpc.${config.GLOBAL_NETWORK}.near.org`,
  };
  const near = await connect({ ...nearConfig, keyStore });
  return near;
}

export async function setFactoryFullAccessKey(
  factoryKey: string,
  factoryAccountId: string,
  config: Config,
) {
  const keyPair = KeyPair.fromString(factoryKey);
  await keyStore.setKey(config.GLOBAL_NETWORK, factoryAccountId, keyPair);
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
  signerAccount: any;
  receiverId: string;
  methodName: string;
  args: any;
  deposit: string;
  gas: string;
  wasmPath?: string;
}) {
  const result = await signerAccount.signAndSendTransaction({
    receiverId: receiverId,
    actions: [
      ...(wasmPath
        ? [transactions.deployContract(fs.readFileSync(wasmPath))]
        : []),
      transactions.functionCall(
        methodName,
        Buffer.from(JSON.stringify(args)),
        gas,
        utils.format.parseNearAmount(deposit),
      ),
    ],
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
  signerAccount: any;
  newAccountId: string;
  amount: string;
  near: any;
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
    args: { ...args, contract_key: keyPair.publicKey.toString() },
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
  signerAccount: any;
  newAccountId: string;
  amount: string;
  config: Config;
}) {
  const keyPair = KeyPair.fromRandom("ed25519");
  const publicKey = keyPair.publicKey.toString();
  await keyStore.setKey(config.GLOBAL_NETWORK, newAccountId, keyPair);

  await signerAccount.functionCall({
    contractId: config.GLOBAL_NETWORK === "testnet" ? "testnet" : "near",
    methodName: "create_account",
    args: {
      new_account_id: newAccountId,
      new_public_key: publicKey,
    },
    gas: "300000000000000",
    attachedDeposit: utils.format.parseNearAmount(amount),
  });
  return keyPair.toString();
}

// Convert the map to CSV with the key and the raw JSON stringified data
export const convertMapToRawJsonCsv = (
  map: Map<string, Record<string, string>>,
  config: Config,
): string => {
  let csvString = "Secret Key,Raw JSON Data\n"; // CSV header

  for (const [encodedTicket, attendeeInfo] of map.entries()) {
    const rawJsonData = JSON.stringify(attendeeInfo);
    csvString += `"${rawJsonData}",${config.TICKET_URL_BASE}${encodedTicket}\n`;
  }

  return csvString;
};

// Helper function to update the EXISTING_FACTORY in config.ts dynamically
export const updateConfigFile = (newFactoryId: string, environment: string) => {
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
    /export const EXISTING_FACTORY = `.*?`;/,
    `export const EXISTING_FACTORY = \`${newFactoryId}\`;`,
  );

  // Write the updated content back to the correct config file
  fs.writeFileSync(configFilePath, updatedContent);
  console.log(
    `Updated ${environment}/config.ts with new factory ID: ${newFactoryId}`,
  );
};
