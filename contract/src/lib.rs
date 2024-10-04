// lib.rs
use near_sdk::json_types::{U128, U64};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, near, require, AccountId, Allowance, BorshStorageKey, Gas, GasWeight, NearToken,
    PanicOnDefault, Promise, PublicKey,
};

use omni_transaction::transaction_builder::TransactionBuilder;
use omni_transaction::transaction_builder::TxBuilder;
use omni_transaction::{
    near::types::{
        AccessKey as OmniAccessKey, AccessKeyPermission as OmniAccessKeyPermission,
        Action as OmniAction, AddKeyAction as OmniAddKeyAction, BlockHash as OmniBlockHash,
        FunctionCallAction as OmniFunctionCallAction, PublicKey as OmniPublicKey, U128 as OmniU128,
        U64 as OmniU64,
    },
    types::NEAR,
};
use std::collections::HashMap;

pub mod active_trial;
pub mod internal;
pub mod models;
pub mod trial_management;

pub use models::*;

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
