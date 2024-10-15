// lib.rs
use near_sdk::json_types::{Base58CryptoHash, U64};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, near, require, AccountId, Allowance, BorshStorageKey, Gas, GasWeight, NearToken,
    PanicOnDefault, Promise, PublicKey,
};

use omni_transaction::transaction_builder::TransactionBuilder;
use omni_transaction::transaction_builder::TxBuilder;
use omni_transaction::{
    near::types::{
        Action as OmniAction, BlockHash as OmniBlockHash,
        FunctionCallAction as OmniFunctionCallAction, U128 as OmniU128, U64 as OmniU64,
    },
    types::NEAR,
};
use std::collections::HashMap;

pub mod models;
pub mod trial_creator;
pub mod trial_user;
pub mod utils;
pub mod views;

pub use models::*;
pub use trial_creator::*;
pub use trial_user::*;
pub use utils::*;

#[near(contract_state, serializers = [borsh])]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub trial_data_by_id: LookupMap<TrialId, TrialData>,
    pub key_usage_by_pk: LookupMap<PublicKey, KeyUsage>,
    pub admin_account: AccountId,
    pub mpc_contract: AccountId,
    pub trial_nonce: TrialId,
}

#[near]
impl Contract {
    #[init]
    pub fn new(admin_account: AccountId, mpc_contract: AccountId) -> Self {
        Self {
            trial_data_by_id: LookupMap::new(StorageKeys::TrialDataById),
            key_usage_by_pk: LookupMap::new(StorageKeys::KeyUsageByPK),
            admin_account,
            mpc_contract,
            trial_nonce: 0,
        }
    }
}
