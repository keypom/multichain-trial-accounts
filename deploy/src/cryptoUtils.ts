// cryptoUtils.ts

import { ec as EC } from "elliptic";
import { KeyType } from "@near-js/crypto";
import bs58 from "bs58";
import { sha256 } from "js-sha256";
import { Signature } from "@near-js/transactions";

/**
 * Recovers the public key from a signature and message hash.
 * @param msgHash - The hash of the message.
 * @param signature - The signature components { r, s }.
 * @param recoveryId - The recovery ID.
 * @returns The recovered EC KeyPair.
 */
export function recoverPublicKeyFromSignature(
  msgHash: Uint8Array,
  signature: { r: Buffer; s: Buffer },
  recoveryId: number,
): EC.KeyPair {
  const ec = new EC("secp256k1");

  // Ensure recovery ID is within 0-3
  if (recoveryId < 0 || recoveryId > 3) {
    throw new Error(`Invalid recovery ID: ${recoveryId}`);
  }

  // Convert message hash to Buffer
  const msgHashBuffer = Buffer.from(msgHash);

  // Recover the public key point
  const recoveredPubPoint = ec.recoverPubKey(
    msgHashBuffer,
    { r: signature.r, s: signature.s },
    recoveryId,
  );

  // Create a KeyPair from the recovered public key point
  const recoveredKeyPair = ec.keyFromPublic(recoveredPubPoint);

  return recoveredKeyPair;
}

/**
 * Compresses an uncompressed public key.
 * @param publicKeyBytes - The uncompressed public key bytes.
 * @returns The compressed public key bytes.
 */
export function compressPublicKey(publicKeyBytes: Buffer): Buffer {
  const ec = new EC("secp256k1");
  const keyPair = ec.keyFromPublic(publicKeyBytes);
  const compressedKey = Buffer.from(
    keyPair.getPublic().encode("array", true), // 'true' for compressed
  );
  return compressedKey;
}

/**
 * Creates a NEAR Signature object from r, s, and recovery ID.
 * @param r - The r component of the signature.
 * @param s - The s component of the signature.
 * @param recoveryId - The recovery ID.
 * @returns A NEAR Signature object.
 */
export function createSignature(
  r: Buffer,
  s: Buffer,
  recoveryId: number,
): Signature {
  const combinedSignature = Buffer.concat([r, s, Buffer.from([recoveryId])]);
  return new Signature({
    keyType: KeyType.SECP256K1,
    data: combinedSignature,
  });
}

/**
 * Hashes the serialized transaction using SHA-256.
 * @param serializedTx - The serialized transaction bytes.
 * @returns The SHA-256 hash as a Uint8Array.
 */
export function hashTransaction(serializedTx: Uint8Array): Uint8Array {
  return new Uint8Array(sha256.array(serializedTx));
}

/**
 * Parses the NEAR public key from its string representation.
 * @param mpcPublicKey - The NEAR-formatted public key string.
 * @returns The decoded public key bytes.
 */
export function parsePublicKey(mpcPublicKey: string): Buffer {
  // Remove 'secp256k1:' prefix and decode
  const publicKeyBytes = bs58.decode(mpcPublicKey.replace("secp256k1:", ""));
  return Buffer.from(publicKeyBytes);
}
