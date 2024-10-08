// kdf.js

const { Ethereum } = require("./ethereum");

/**
 * Retrieves the derived public key from the MPC service.
 *
 * @param accountId - The NEAR account ID.
 * @param path - The derivation path.
 * @returns A Promise that resolves to a Buffer containing the public key.
 */
async function getDerivedPublicKeyFromMpc(accountId, path) {
  const ETH = new Ethereum(
    "https://base-sepolia.g.alchemy.com/v2/4xc1NYZZl13rL_yWxgTJdrdcJys8ug3Y",
    84532,
  );
  console.log(`accountId: ${accountId} path: ${path}`);
  const { publicKey, address } = await ETH.deriveAddress(accountId, path);
  return publicKey;
}

module.exports = {
  getDerivedPublicKeyFromMpc,
};
