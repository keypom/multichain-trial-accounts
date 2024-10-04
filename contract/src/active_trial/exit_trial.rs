// active_trial/exit_trial.rs
use crate::*;
use near_sdk::{env, near_bindgen, Promise};

#[near]
impl Contract {
    /// Allows a trial user to exit the trial, adding a full access key to their account.
    pub fn exit_trial(&mut self, public_key: PublicKey, derivation_path: String) {
        let signer_pk = env::signer_account_pk();
        let key_usage = self.key_usage_by_pk.get(&signer_pk).expect("Access denied");

        let trial_data = self
            .trial_data_by_id
            .get(&key_usage.trial_id)
            .expect("Trial data not found");

        // Build the transaction to add a full access key
        let add_key_action = Action::AddKey(Box::new(AddKeyAction {
            public_key: public_key.clone(),
            access_key: AccessKey {
                nonce: U64(0),
                permission: AccessKeyPermission::FullAccess,
            },
        }));

        let tx = TransactionBuilder::new::<NEAR>()
            .signer_id(env::current_account_id())
            .signer_public_key(signer_pk.into())
            .nonce(0) // Replace with appropriate nonce
            .receiver_id(env::current_account_id())
            .block_hash(env::block_hash().into())
            .actions(vec![add_key_action])
            .build();

        let payload = tx.build_for_signing();

        // Call the MPC contract to sign the transaction
        let sign_request = SignRequest {
            payload,
            path: derivation_path.clone(),
            key_version: 0, // Update as needed
            chain_id: trial_data.chain_id,
        };

        Promise::new(self.mpc_contract.clone()).function_call(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&sign_request).unwrap(),
            0,
            env::prepaid_gas() - env::used_gas(),
        );
    }
}
