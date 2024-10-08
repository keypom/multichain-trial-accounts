// src/broadcastFromSignature.ts

import { initNear, broadcastTransaction, TrialKey } from "./src/index";
import fs from "fs";
import path from "path";
import { actionsToPerform, config } from "./config";

async function broadcastFromSignature() {
  console.log("Initializing NEAR connection...");
  const near = await initNear(config);

  const signaturesFilePath = path.join(config.dataDir, "signatures.json");

  if (!fs.existsSync(signaturesFilePath)) {
    console.error(`Signatures file not found: ${signaturesFilePath}`);
    return;
  }

  // Read signatures mapping from the file
  const accountSignatures: { [accountId: string]: any } = JSON.parse(
    fs.readFileSync(signaturesFilePath, "utf-8"),
  );

  // Read trial keys to get the MPC key and trial account public key
  const trialDataFilePath = path.join(config.dataDir, `trialData.json`);
  const trialDataContent: any = JSON.parse(
    fs.readFileSync(trialDataFilePath, "utf-8"),
  );
  const { trialKeys } = trialDataContent;

  // Iterate over each account and broadcast their transactions
  for (const trialAccountId of Object.keys(accountSignatures)) {
    console.log(`Broadcasting transactions for account: ${trialAccountId}`);

    const {
      signatures,
      nonces,
      blockHash,
      mpcPublicKey,
      trialAccountPublicKey,
    } = accountSignatures[trialAccountId];

    // Load the trial account
    const trialAccount = await near.account(trialAccountId);

    // Get the MPC key for this trial account
    const trialKey = trialKeys.find(
      (tk: TrialKey) => tk.trialAccountId === trialAccountId,
    );
    if (!trialKey) {
      console.error(`Trial key not found for account: ${trialAccountId}`);
      continue;
    }

    // Broadcast transactions
    for (let i = 0; i < actionsToPerform.length; i++) {
      // Ensure signatures[i] exists
      if (!signatures[i]) {
        console.error(
          `Missing signature for action ${i + 1} of account ${trialAccountId}`,
        );
        continue;
      }

      const broadcastParams = {
        signerAccount: trialAccount,
        actionToPerform: actionsToPerform[i],
        signatureResult: signatures[i],
        nonce: nonces[i],
        blockHash,
        mpcPublicKey, // Pass in the MPC public key
        trialAccountPublicKey,
        txHash: signatures[i].txHash || [], // Ensure txHash is an array
      };

      await broadcastTransaction(broadcastParams);
    }

    console.log(`https://testnet.nearblocks.io/address/${trialAccountId}`);
  }

  console.log("All transactions broadcasted.");
}

broadcastFromSignature().catch((error) => {
  console.error("Error in broadcastFromSignature:", error);
});
