import { Account } from "@near-js/accounts";
import { KeyPair } from "@near-js/crypto";

// @ts-nocheck

import { getDerivedPublicKeyFromMpc } from "./mpcUtils/kdf"; // If unchanged
import bs58 from "bs58";

import { sendTransaction, writeKeysToFile } from "./utils";

function convertSecp256k1KeyToPublicKey(mpcKeyData: Buffer) {
  // Ensure mpcKeyData is a Buffer
  if (!Buffer.isBuffer(mpcKeyData)) {
    throw new Error("mpcKeyData must be a Buffer");
  }

  // Check that the key is 65 bytes and starts with 0x04
  if (mpcKeyData.length !== 65 || mpcKeyData[0] !== 0x04) {
    throw new Error("Invalid uncompressed secp256k1 public key");
  }

  // Remove the first byte (0x04)
  const keyData = mpcKeyData.slice(1); // 64 bytes

  // Curve type byte: 1 for secp256k1
  const curveTypeByte = Buffer.from([1]);

  // Combine curve type byte and key data
  const publicKeyData = Buffer.concat([curveTypeByte, keyData]);

  // Base58 encode the key data (excluding the curve type byte) for string representation
  const base58EncodedKeyData = bs58.encode(keyData);

  // Construct the string representation
  const publicKeyString = `secp256k1:${base58EncodedKeyData}`;

  // Return the PublicKey object
  return {
    data: publicKeyData,
    toString: () => publicKeyString,
  };
}

export async function addTrialKeys(
  signerAccount: Account,
  contractAccountId: string,
  trialId: number,
  numberOfKeys: number,
  dataDir: string,
): Promise<KeyPair[]> {
  console.log(`Adding ${numberOfKeys} trial keys...`);

  const trialAccountIds: string[] = []; // Store trial account IDs
  const keyPairs: KeyPair[] = [];
  const mpcKeys: string[] = []; // Store MPC keys

  for (let i = 0; i < numberOfKeys; i++) {
    // Generate a new key pair
    const keyPair = KeyPair.fromRandom("ed25519");
    keyPairs.push(keyPair);

    // Derive the MPC public key
    const derivationPath = keyPair.getPublicKey().toString();
    const mpcPublicKeyBuffer = await getDerivedPublicKeyFromMpc(
      contractAccountId,
      derivationPath,
    );
    const mpcPublicKey =
      convertSecp256k1KeyToPublicKey(mpcPublicKeyBuffer).toString();
    mpcKeys.push(mpcPublicKey);

    // Generate a trial account ID
    const trialAccountId = `${Date.now().toString()}-trial-${i}.testnet`;
    trialAccountIds.push(trialAccountId);
  }

  // Call the `add_trial_keys` function using `sendTransaction`
  const keysWithMpc = trialAccountIds.map((trialAccountId, index) => ({
    public_key: keyPairs[index].getPublicKey().toString(),
    mpc_key: mpcKeys[index],
  }));

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
    // Write the keys to file, mapping the trial account ID, private key, trial ID, and MPC key
    writeKeysToFile(trialAccountIds, keyPairs, trialId, mpcKeys, dataDir);
  } else {
    throw new Error("Failed to add trial keys");
  }

  return keyPairs;
}
