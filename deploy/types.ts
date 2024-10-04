// types.ts

// Define the types for TrialData and related structures

export interface UsageConstraints {
  maxContracts?: number;
  maxMethods?: number;
}

export interface InteractionLimits {
  maxInteractionsPerDay?: number;
  totalInteractions?: number;
}

export interface FunctionSuccessCondition {
  contract_id: string;
  method_name: string;
  expected_return: string;
}

export interface ExitConditions {
  transactionLimit?: number;
  successCondition?: FunctionSuccessCondition;
  timeLimit?: number; // timestamp in nanoseconds
}

export interface ActionToPerform {
  targetContractId: string;
  methodName: string;
  args: any;
  attachedDepositNear: string;
  gas: string;
}

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

// Configuration types
export interface CreationConfig {
  deployContract: boolean;
  createNewTrial: boolean;
  addTrialAccounts: boolean;
  premadeTrialAccounts: boolean;
  performAction: boolean;
}

export interface Config {
  GLOBAL_NETWORK: string;
  SIGNER_ACCOUNT: string;
  CREATION_CONFIG: CreationConfig;
  EXISTING_TRIAL_CONTRACT: string;
  NUM_TRIAL_KEYS: number;
  MPC_CONTRACT: string;
  TRIAL_DATA: TrialData;
}

// Premade Ticket Data
export interface PremadeTicket {
  name: string;
  email: string;
}

export type PremadeTicketData = PremadeTicket[];
