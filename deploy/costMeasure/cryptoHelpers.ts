// cryptoHelpers.ts
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getPubFromSecret } from "@keypom/core";

// Function to generate signature
export function generateSignature(secretKeyStr: string, callerId: string) {
  const secretKeyBase58 = secretKeyStr.replace("ed25519:", "");
  const secretKeyBytes = bs58.decode(secretKeyBase58);
  const keyPair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const publicKeyBase58 = bs58.encode(keyPair.publicKey);
  const message = `${callerId},${publicKeyBase58}`;
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keyPair.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");
  return {
    signature: signatureBase64,
    publicKey: `ed25519:${publicKeyBase58}`,
  };
}

export const getPublicKey = (secretKey: string) => {
  const strippedSecretKey = secretKey.replace("ed25519:", "");
  const pubKey = getPubFromSecret(`ed25519:${strippedSecretKey}`);
  return pubKey;
};
