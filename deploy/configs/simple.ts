// src/configs/simple.ts

import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";
import { TrialData, ActionToPerform } from "@keypom/trial-accounts";
import path from "path";
import os from "os";
import { Config } from "./type";

const homedir = os.homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);

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
    args: { text: "Hello from the simple config!" },
    attachedDepositNear: "1",
    gas: "300000000000000",
  },
];
