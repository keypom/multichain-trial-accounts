// models/usage_constraints.rs
use crate::*;
use near_sdk::{json_types::U128, AccountId};

/// Specifies usage constraints like max contracts and methods.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UsageConstraints {
    pub max_contracts: Option<u64>,
    pub max_methods: Option<u64>,
    pub max_token_transfer: Option<U128>,
    pub rate_limit_per_minute: Option<u64>,
    pub blacklisted_addresses: Vec<AccountId>,
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

/// Represents a function success condition based on output.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct FunctionSuccessCondition {
    pub contract_id: AccountId,
    pub method_name: String,
    pub expected_return: String,
}
