// models/trial_data.rs
use crate::*;

/// Contains data about a trial, such as allowed methods, contracts, limits, etc.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct TrialData {
    pub allowed_methods: Vec<String>,
    pub allowed_contracts: Vec<AccountId>,
    pub max_gas: Option<Gas>,
    pub max_deposit: Option<NearToken>,
    pub usage_constraints: Option<UsageConstraints>,
    pub interaction_limits: Option<InteractionLimits>,
    pub exit_conditions: Option<ExitConditions>,
    pub expiration_time: Option<u64>, // timestamp in nanoseconds
    pub initial_deposit: NearToken,
    pub chain_id: u64,
    pub creator_account_id: AccountId,
}

impl TrialData {
    /// Checks if a method is allowed.
    pub fn is_method_allowed(&self, method: &str) -> bool {
        self.allowed_methods.contains(&method.to_string())
    }

    /// Checks if a contract is allowed.
    pub fn is_contract_allowed(&self, contract: &AccountId) -> bool {
        self.allowed_contracts.contains(contract)
    }
}
