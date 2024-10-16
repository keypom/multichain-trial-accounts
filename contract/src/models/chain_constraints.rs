use near_sdk::json_types::U128;
use omni_transaction::evm::types::Address;

use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
#[serde(untagged)]
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
    pub allowed_methods: Vec<String>,    // Function signatures or names
    pub allowed_contracts: Vec<Address>, // Ethereum addresses
    pub max_gas: Option<u64>,            // Gas limit
    pub max_value: Option<U128>,         // Value in wei
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
#[serde(untagged)]
pub enum ExtChainConstraints {
    NEAR(NearConstraints),
    EVM(ExtEvmConstraints),
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct ExtEvmConstraints {
    pub allowed_methods: Vec<String>,   // Function signatures or names
    pub allowed_contracts: Vec<String>, // Ethereum addresses
    pub max_gas: Option<u64>,           // Gas limit
    pub max_value: Option<U128>,        // Value in wei
}
