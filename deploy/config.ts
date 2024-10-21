// src/configs/simple.ts

import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";
import path from "path";
import os from "os";

const homedir = os.homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);

export const config = {
  networkId: "testnet",
  signerAccountId: "benjiman.testnet",
  keyStore: new UnencryptedFileSystemKeyStore(credentialsPath),
  mpcContractId: "v1.signer-prod.testnet",
};
