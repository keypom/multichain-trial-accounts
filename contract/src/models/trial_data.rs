// models/trial_data.rs
use crate::*;

/// Contains data about a trial, such as allowed methods, contracts, limits, etc.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct TrialData {
    pub chain_constraints: ChainConstraints,
    pub usage_constraints: Option<UsageConstraints>,
    pub interaction_limits: Option<InteractionLimits>,
    pub exit_conditions: Option<ExitConditions>,
    pub expiration_time: Option<u64>, // Timestamp in nanoseconds
    pub initial_deposit: NearToken,
    pub chain_id: u64,
    pub creator_account_id: AccountId,
}

impl TrialData {
    /// Checks if a method is allowed.
    pub fn is_method_allowed(&self, method: &str) -> bool {
        match self.chain_constraints {
            ChainConstraints::NEAR(ref constraints) => {
                constraints.allowed_methods.contains(&method.to_string())
            }
            ChainConstraints::EVM(ref constraints) => {
                constraints.allowed_methods.contains(&method.to_string())
            }
        }
    }

    /// Checks if a contract is allowed.
    pub fn is_contract_allowed(&self, contract: String) -> bool {
        match self.chain_constraints {
            ChainConstraints::NEAR(ref constraints) => {
                let contract: AccountId = contract.parse().expect("Invalid AccountId");
                constraints.allowed_contracts.contains(&contract)
            }
            ChainConstraints::EVM(ref constraints) => {
                let eth_address: [u8; 20] =
                    contract.as_bytes().try_into().expect("Invalid address");
                constraints.allowed_contracts.contains(&eth_address)
            }
        }
    }
}
