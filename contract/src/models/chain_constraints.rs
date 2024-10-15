use near_sdk::json_types::U128;

use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub enum ChainConstraints {
    NEAR(NearConstraints),
    EVM(EvmConstraints),
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct NearConstraints {
    pub allowed_methods: Vec<String>,
    pub allowed_contracts: Vec<AccountId>,
    pub max_gas: Option<Gas>,
    pub max_deposit: Option<NearToken>,
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct EvmConstraints {
    pub allowed_methods: Vec<String>,     // Function signatures or names
    pub allowed_contracts: Vec<[u8; 20]>, // Ethereum addresses
    pub max_gas: Option<u64>,             // Gas limit
    pub max_value: Option<U128>,          // Value in wei
}
