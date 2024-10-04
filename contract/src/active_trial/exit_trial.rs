// active_trial/exit_trial.rs
use crate::*;

#[near]
impl Contract {
    /// Allows a trial user to exit the trial, adding a full access key to their account.
    pub fn exit_trial(&mut self, public_key: PublicKey, derivation_path: String) -> Promise {
        let signer_pk = env::signer_account_pk();
        let key_usage = self.key_usage_by_pk.get(&signer_pk).expect("Access denied");

        let trial_data = self
            .trial_data_by_id
            .get(&key_usage.trial_id)
            .expect("Trial data not found");

        // Build the transaction to add a full access key
        let add_key_action = OmniAction::AddKey(Box::new(OmniAddKeyAction {
            public_key: OmniPublicKey::try_from(public_key.as_bytes()).expect("Invalid public key"),
            access_key: OmniAccessKey {
                nonce: OmniU64(0),
                permission: OmniAccessKeyPermission::FullAccess,
            },
        }));

        let tx = TransactionBuilder::new::<NEAR>()
            .signer_id(env::current_account_id().to_string())
            .signer_public_key(OmniPublicKey::try_from(signer_pk.as_bytes()).unwrap())
            .nonce(0) // Replace with appropriate nonce
            .receiver_id(env::current_account_id().to_string())
            .block_hash(OmniBlockHash([0u8; 32]))
            .actions(vec![add_key_action])
            .build();

        let payload = tx.build_for_signing();

        // Call the MPC contract to sign the transaction
        let sign_request = SignRequest {
            payload,
            path: derivation_path.clone(),
            key_version: 0, // Update as needed
        };

        Promise::new(self.mpc_contract.clone()).function_call_weight(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&sign_request).unwrap(),
            NearToken::from_yoctonear(0),
            Gas::from_tgas(30),
            GasWeight(1),
        )
    }
}
