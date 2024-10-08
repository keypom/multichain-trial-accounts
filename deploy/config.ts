import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";
import { Config, TrialData, ActionToPerform } from "./src/index";

import fs from "fs";
import path from "path";
import os from "os";

const homedir = os.homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);

// User configuration
export const config: Config = {
  networkId: "testnet",
  signerAccountId: "benjiman.testnet",
  keyStore: new UnencryptedFileSystemKeyStore(credentialsPath),
  mpcContractId: "v1.signer-prod.testnet",
  numberOfKeys: 1,
  dataDir: "./data",
};

export const trialData: TrialData = {
  allowedMethods: ["add_message"],
  allowedContracts: ["guestbook.near-examples.testnet"],
  initialDeposit: "10",
  chainId: 1313161555,
};

export const actionsToPerform: ActionToPerform[] = [
  {
    targetContractId: "guestbook.near-examples.testnet",
    methodName: "add_message",
    args: { text: "Hello from MPC!" },
    attachedDepositNear: "1",
    gas: "300000000000000",
  },
];
