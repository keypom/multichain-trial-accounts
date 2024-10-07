// config.ts

import { ActionToPerform, Config, CreationConfig, TrialData } from "../types";

export const GLOBAL_NETWORK = "testnet";
export const SIGNER_ACCOUNT = "benjiman.testnet";
export const EXISTING_TRIAL_CONTRACT = `1728318571966-trial-contract.testnet`;
export const NUM_TRIAL_KEYS = 1;

export const CREATION_CONFIG: CreationConfig = {
  deployContract: true,
  broadcastOnly: true,

  createNewTrial: true,
  addTrialAccounts: true,
  premadeTrialAccounts: true,

  performAction: true,
};

export const MPC_CONTRACT = "v1.signer-prod.testnet";

export const TRIAL_DATA: TrialData = {
  allowedMethods: ["addMessage"],
  allowedContracts: ["guest-book.testnet"],
  maxGas: undefined,
  maxDeposit: undefined,
  usageConstraints: undefined,
  interactionLimits: undefined,
  exitConditions: undefined,
  expirationTime: undefined,
  initialDeposit: "10",
  chainId: 1313161555, // Example chain ID
};

export const ACTION_PERFORMED: ActionToPerform = {
  targetContractId: "guest-book.testnet",
  methodName: "addMessage",
  args: {
    message: "Hello, World!",
  },
  attachedDepositNear: "1",
  gas: "300000000000000",
};

const config: Config = {
  GLOBAL_NETWORK,
  SIGNER_ACCOUNT,
  EXISTING_TRIAL_CONTRACT,
  NUM_TRIAL_KEYS,
  CREATION_CONFIG,
  MPC_CONTRACT,
  TRIAL_DATA,
};

export default config;
