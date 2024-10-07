// broadcastFromSignature.ts

import { initNear, TrialKey } from "./index";
import { broadcastTransaction } from "./performAction";
import fs from "fs";
import path from "path";
import { actionsToPerform, config } from "./config";

async function broadcastFromSignature() {
  console.log("Broadcasting transactions...");
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

  // Read trial keys to get the MPC key
  const trialKeysFilePath = path.join(config.dataDir, `trial-1-keys.json`);
  const trialKeys: TrialKey[] = JSON.parse(
    fs.readFileSync(trialKeysFilePath, "utf-8"),
  );

  // Iterate over each account and broadcast their transactions
  for (const trialAccountId of Object.keys(accountSignatures)) {
    console.log(`Broadcasting transactions for account: ${trialAccountId}`);

    const { signatures, nonces, blockHash } = accountSignatures[trialAccountId];

    // Load the trial account
    const trialAccount = await near.account(trialAccountId);

    // Get the MPC key for this trial account
    const trialKey = trialKeys.find(
      (tk) => tk.trialAccountId === trialAccountId,
    );
    if (!trialKey) {
      console.error(`Trial key not found for account: ${trialAccountId}`);
      continue;
    }
    const mpcPublicKey = trialKey.mpcKey;

    // Broadcast transactions
    for (let i = 0; i < actionsToPerform.length; i++) {
      await broadcastTransaction({
        signerAccount: trialAccount,
        actionToPerform: actionsToPerform[i],
        signatureResult: signatures[i],
        nonce: nonces[i],
        blockHash,
        mpcPublicKey, // Pass in the MPC public key
        trialAccountPublicKey: trialKey.trialAccountPublicKey,
      });
    }
  }
}

broadcastFromSignature().catch(console.error);
