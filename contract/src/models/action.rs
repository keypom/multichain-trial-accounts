use near_sdk::json_types::U128;
use omni_transaction::evm::types::Address;

use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub enum Action {
    NEAR(NearAction),
    EVM(EvmAction),
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct NearAction {
    pub method_name: String,
    pub contract_id: AccountId,
    pub gas_attached: Gas,
    pub deposit_attached: NearToken,
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct EvmAction {
    pub chain_id: u64, // Chain ID for EVM
    pub method_name: String,
    pub contract_address: Address,
    pub gas_limit: u128,
    pub value: U128, // Value in wei
}
