// src/main.ts

import { deployTrialContract } from "./utils/deploy";
import { initNear } from "./utils/nearUtils";
import { config } from "./config";
import { KeyPair } from "@near-js/crypto";

async function main() {
  // Initialize NEAR connection
  const near = await initNear(config);
  const signerAccount = await near.account(config.signerAccountId);

  // Deploy trial contract
  const trialContractId = `${Date.now().toString()}-trial-contract.testnet`;
  console.log(`Deploying trial contract with ID: ${trialContractId}`);
  const trialFactoryAccountSecretKey = await deployTrialContract({
    near,
    config,
    signerAccount,
    contractAccountId: trialContractId,
    mpcContractId: config.mpcContractId,
    wasmFilePath: "./out/trials.wasm", // Adjust the path as needed
    initialBalance: "50", // Adjust as needed
  });

  // Set the trial key in the keyStore
  const keyStore: any = (near.connection.signer as any).keyStore;
  await keyStore.setKey(
    near.connection.networkId,
    trialContractId,
    KeyPair.fromString(trialFactoryAccountSecretKey),
  );
}

main().catch((error) => {
  console.error("Error in deploy: " + error);
});
