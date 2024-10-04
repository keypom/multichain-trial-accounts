use std::str::FromStr;

use crate::*;

/// Options for `create_account_advanced`.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct CreateAccountOptions {
    pub full_access_keys: Option<Vec<PublicKey>>,
}

#[near]
impl Contract {
    /// Activates a trial by creating a new account with a full access key derived from the trial's key usage data.
    /// Only the trial creator can activate the trial.
    #[payable]
    pub fn activate_trial(&mut self, new_account_id: AccountId) -> Promise {
        // Get the stored key usage data for the trial, which contains the MPC public key
        let key_usage = self
            .key_usage_by_pk
            .get_mut(&env::signer_account_pk())
            .expect("No key usage data found for this trial");

        require!(
            key_usage.account_id.is_none(),
            "The trial has already been activated"
        );
        key_usage.account_id = Some(new_account_id.clone());

        let trial_id = key_usage.trial_id;
        let trial_data = self
            .trial_data_by_id
            .get(&trial_id)
            .expect("Trial data not found");

        // Retrieve the MPC public key for this trial
        let mpc_public_key = key_usage.mpc_key.clone();

        // Create account options with the full access key as the MPC public key
        let account_options = CreateAccountOptions {
            full_access_keys: Some(vec![mpc_public_key]),
        };

        // Call the MPC contract to get a signature
        Promise::new(AccountId::from_str("testnet").unwrap()).function_call_weight(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&account_options).unwrap(),
            NearToken::from_yoctonear(trial_data.initial_deposit.as_yoctonear()),
            Gas::from_tgas(30),
            GasWeight(1),
        )
    }
}
