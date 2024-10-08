// kdfUtils.js

const base_decode = require("near-api-js/lib/utils/serialize").base_decode;
const EC = require("elliptic").ec;
const keccak256 = require("viem").keccak256;
const hash = require("hash.js");
const bs58check = require("bs58check");
const sha3_256 = require("js-sha3").sha3_256;

const rootPublicKey =
  "secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3";

// Convert root public key string to uncompressed hex point
function najPublicKeyStrToUncompressedHexPoint() {
  const res =
    "04" +
    Buffer.from(base_decode(rootPublicKey.split(":")[1])).toString("hex");
  return res;
}

// Derive Child Public Key
async function deriveChildPublicKey(
  parentUncompressedPublicKeyHex,
  signerId,
  path = "",
) {
  const ec = new EC("secp256k1");
  const scalarHex = sha3_256(
    `near-mpc-recovery v0.1.0 epsilon derivation:${signerId},${path}`,
  );

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  const oldPublicKeyPoint = ec.curve.point(x, y);
  const scalarTimesG = ec.g.mul(scalarHex);
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);

  const newX = newPublicKeyPoint.getX().toString("hex").padStart(64, "0");
  const newY = newPublicKeyPoint.getY().toString("hex").padStart(64, "0");

  return "04" + newX + newY;
}

// Convert to EVM address
function uncompressedHexPointToEvmAddress(uncompressedHexPoint) {
  const addressHash = keccak256(`0x${uncompressedHexPoint.slice(2)}`);
  return "0x" + addressHash.substring(addressHash.length - 40);
}

// Convert to BTC address
async function uncompressedHexPointToBtcAddress(publicKeyHex, network) {
  const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));
  const sha256HashOutput = await crypto.subtle.digest(
    "SHA-256",
    publicKeyBytes,
  );
  const ripemd160 = hash
    .ripemd160()
    .update(Buffer.from(sha256HashOutput))
    .digest();
  const network_byte = network === "bitcoin" ? 0x00 : 0x6f;
  const networkByte = Buffer.from([network_byte]);
  const networkByteAndRipemd160 = Buffer.concat([
    networkByte,
    Buffer.from(ripemd160),
  ]);
  return bs58check.encode(networkByteAndRipemd160);
}

module.exports = {
  najPublicKeyStrToUncompressedHexPoint,
  deriveChildPublicKey,
  uncompressedHexPointToEvmAddress,
  uncompressedHexPointToBtcAddress,
};
