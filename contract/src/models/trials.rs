use crate::*;

/// Contains data about a trial, such as allowed methods, contracts, limits, etc.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct TrialData {
    pub allowed_methods: Vec<String>,
    pub allowed_contracts: Vec<AccountId>,
    pub max_gas: Option<u64>,
    pub max_deposit: Option<U128>,
    pub usage_constraints: Option<UsageConstraints>,
    pub interaction_limits: Option<InteractionLimits>,
    pub exit_conditions: Option<ExitConditions>,
    pub expiration_time: Option<u64>, // timestamp in nanoseconds
    pub chain_id: u64,
    pub creator_account_id: AccountId,
}

/// Specifies usage constraints like max contracts and methods.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UsageConstraints {
    pub max_contracts: Option<u64>,
    pub max_methods: Option<u64>,
}

/// Defines interaction limits for trial accounts.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct InteractionLimits {
    pub max_interactions_per_day: Option<u64>,
    pub total_interactions: Option<u64>,
}

/// Specifies exit conditions for trial accounts.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct ExitConditions {
    pub transaction_limit: Option<u64>,
    pub success_condition: Option<FunctionSuccessCondition>,
    pub time_limit: Option<u64>, // timestamp in nanoseconds
}

/// Tracks usage statistics for trial accounts.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UsageStats {
    pub interactions_per_day: HashMap<u64, u64>, // Day timestamp to interaction count
    pub total_interactions: u64,
    pub methods_called: HashMap<String, u64>, // method_name to count
    pub contracts_called: HashMap<AccountId, u64>, // contract_id to count
    pub gas_used: u64,
    pub deposit_used: U128,
}
// Implement default for UsageStats
impl Default for UsageStats {
    fn default() -> Self {
        Self {
            interactions_per_day: HashMap::new(),
            total_interactions: 0,
            methods_called: HashMap::new(),
            contracts_called: HashMap::new(),
            gas_used: 0,
            deposit_used: U128(0),
        }
    }
}

/// Associates a public key with its usage stats and trial ID.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct KeyUsage {
    pub trial_id: TrialId,
    pub usage_stats: UsageStats,
}

/// Represents a function success condition based on output.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct FunctionSuccessCondition {
    pub contract_id: AccountId,
    pub method_name: String,
    pub expected_return: String,
}
