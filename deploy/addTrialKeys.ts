import { Account, KeyPair } from "near-api-js";

// @ts-nocheck
import { getDerivedPublicKeyFromMpc } from "./mpcUtils/kdf";
import { sendTransaction } from "./utils";

export async function addTrialKeys(
  signerAccount: Account,
  contractAccountId: string,
  trialId: number,
  numberOfKeys: number,
): Promise<KeyPair[]> {
  console.log(`Adding ${numberOfKeys} trial keys...`);
  const keysWithMpc: { publicKey: string; mpcKey: string }[] = []; // Array to store objects containing public and MPC keys
  const keyPairs: KeyPair[] = [];

  for (let i = 0; i < numberOfKeys; i++) {
    // Generate a new key pair
    const keyPair = KeyPair.fromRandom("ed25519");
    keyPairs.push(keyPair);

    // Derive the MPC public key (this is a placeholder)
    const derivationPath = keyPair.getPublicKey().toString();
    const mpcPublicKey = await getDerivedPublicKeyFromMpc(
      contractAccountId,
      derivationPath,
    );

    // Push the public key and the derived MPC key as an object into the array
    keysWithMpc.push({
      publicKey: keyPair.getPublicKey().toString(),
      mpcKey: mpcPublicKey,
    });
  }

  // Call the `add_trial_keys` function using `sendTransaction`
  const result = await sendTransaction({
    signerAccount: signerAccount,
    receiverId: contractAccountId,
    methodName: "add_trial_keys",
    args: {
      keys: keysWithMpc, // Send the array of objects
      trial_id: trialId,
    },
    deposit: "1", // 0.001 NEAR for storage
    gas: "300000000000000", // Adjust gas as needed
  });

  if (result) {
    console.log("Trial keys added successfully.");
  } else {
    throw new Error("Failed to add trial keys");
  }

  return keyPairs;
}
