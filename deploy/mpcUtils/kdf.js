// kdf.js

const { Ethereum } = require("./ethereum");

// Get Derived Public Key From MPC
async function getDerivedPublicKeyFromMpc(accountId, path) {
  const ETH = new Ethereum(
    "https://base-sepolia.g.alchemy.com/v2/4xc1NYZZl13rL_yWxgTJdrdcJys8ug3Y",
    84532,
  );
  const { publicKey, address } = await ETH.deriveAddress(accountId, path);
  return publicKey;
}

module.exports = {
  getDerivedPublicKeyFromMpc,
};
