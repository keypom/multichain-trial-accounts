// trial/activate.rs
use crate::*;
use hex::FromHex;
use omni_transaction::evm::types::Address;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct CreateAccountOptions {
    pub full_access_keys: Option<Vec<PublicKey>>,
}

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct CreateAccountAdvancedOptions {
    pub options: CreateAccountOptions,
    pub new_account_id: AccountId,
}

#[near]
impl Contract {
    /// Activates a trial by creating a new account with a full access key derived from the trial's key usage data.
    /// Only the trial creator can activate the trial.
    #[payable]
    pub fn activate_trial(&mut self, new_account_id: String, chain_id: String) {
        let chain_id = ChainId(chain_id);

        let user_account_id: UserAccountId = if chain_id.is_near() {
            UserAccountId::NEAR(new_account_id.parse().expect("Invalid NEAR account ID"))
        } else if let Some(_chain_id_num) = chain_id.as_evm_chain_id() {
            let addr_str = new_account_id.trim_start_matches("0x");
            let addr_bytes: [u8; 20] = <[u8; 20]>::from_hex(addr_str)
                .expect("Invalid Ethereum address in allowed_contracts");
            UserAccountId::EVM(Address::from(addr_bytes))
        } else {
            env::panic_str("Invalid chain ID");
        };

        let signer_pk = env::signer_account_pk();
        let key_usage = self
            .key_usage_by_pk
            .get_mut(&signer_pk)
            .expect("No key usage data found for this trial");

        require!(
            key_usage
                .account_id_by_chain_id
                .insert(chain_id, user_account_id.clone())
                .is_none(),
            "The trial has already been activated"
        );

        let trial_id = key_usage.trial_id;
        let trial_data = self
            .trial_data_by_id
            .get(&trial_id)
            .expect("Trial data not found");

        // Retrieve the MPC public key for this trial
        let mpc_public_key = key_usage.mpc_key.clone();

        // Create account options with the full access key as the MPC public key only if the trial is on NEAR
        if let UserAccountId::NEAR(near_account_id) = user_account_id {
            let account_options = CreateAccountAdvancedOptions {
                options: CreateAccountOptions {
                    full_access_keys: Some(vec![mpc_public_key]),
                },
                new_account_id: near_account_id.clone(),
            };

            let root_account: AccountId = "testnet".parse().unwrap();
            Promise::new(root_account).function_call_weight(
                "create_account_advanced".to_string(),
                serde_json::to_vec(&account_options).unwrap(),
                NearToken::from_yoctonear(trial_data.initial_deposit.as_yoctonear()),
                Gas::from_tgas(30),
                GasWeight(1),
            );
        };
    }
}
