// lib.rs
use near_sdk::collections::LookupMap;
use near_sdk::json_types::{U128, U64};
use near_sdk::{
    env, near, AccountId, Allowance, BorshStorageKey, PanicOnDefault, Promise, PublicKey,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod near;

pub mod active_trial;
pub mod internal;
pub mod models;
pub mod transaction_builder;
pub mod trial_management;

pub use models::*;
pub use near::*;

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
