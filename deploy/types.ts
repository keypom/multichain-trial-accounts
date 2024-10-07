// types.ts

import { KeyPair } from "@near-js/crypto";
import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";

/**
 * Constraints on the usage of the trial accounts.
 */
export interface UsageConstraints {
  maxContracts?: number;
  maxMethods?: number;
}

/**
 * Limits on the interactions of the trial accounts.
 */
export interface InteractionLimits {
  maxInteractionsPerDay?: number;
  totalInteractions?: number;
}

/**
 * Condition that defines a successful function call.
 */
export interface FunctionSuccessCondition {
  contractId: string;
  methodName: string;
  expectedReturn: string;
}

/**
 * Conditions under which the trial account will exit.
 */
export interface ExitConditions {
  transactionLimit?: number;
  successCondition?: FunctionSuccessCondition;
  timeLimit?: number; // timestamp in nanoseconds
}

/**
 * Defines an action to be performed on a contract.
 */
export interface ActionToPerform {
  targetContractId: string;
  methodName: string;
  args: any;
  attachedDepositNear: string;
  gas: string;
}

/**
 * Data required to create a trial.
 */
export interface TrialData {
  allowedMethods: string[];
  allowedContracts: string[];
  initialDeposit: string;
  maxGas?: number;
  maxDeposit?: string; // U128 represented as a string
  usageConstraints?: UsageConstraints;
  interactionLimits?: InteractionLimits;
  exitConditions?: ExitConditions;
  expirationTime?: number; // timestamp in nanoseconds
  chainId: number;
}

/**
 * Configuration required to initialize the NEAR connection and other parameters.
 */
export interface Config {
  networkId: string;
  signerAccountId: string;
  keyStore: UnencryptedFileSystemKeyStore;
  mpcContractId: string;
  numberOfKeys: number;
  dataDir: string;
}

/**
 * Key data structure containing information about a trial key.
 */
export interface KeyData {
  publicKey: string;
  secretKey: string;
  trialId: number;
  mpcKey: string;
}

/**
 * Represents a trial key along with its associated account ID and MPC key.
 */
export interface TrialKey {
  trialAccountId: string;
  derivationPath: string;
  keyPair: KeyPair;
  mpcKey: string;
}
