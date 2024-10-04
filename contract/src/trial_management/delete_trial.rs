use crate::*;

#[near]
impl Contract {
    /// Deletes a trial. Only callable by the creator.
    pub fn delete_trial(&mut self, trial_id: TrialId) {
        let trial_data = self
            .trial_data_by_id
            .get(&trial_id)
            .expect("Trial ID does not exist");

        // Only the creator can delete the trial
        assert_eq!(
            env::predecessor_account_id(),
            trial_data.creator_account_id,
            "Only the trial creator can delete the trial"
        );

        let initial_storage = env::storage_usage();
        self.trial_data_by_id.remove(&trial_id);

        self.adjust_deposit(initial_storage, env::storage_usage());
    }

    // Deletes unused trials and returns funds to the creator.
    // pub fn delete_unused_trial(&mut self, trial_id: TrialId, derivation_path: String) {
    //     let trial_data = self
    //         .trial_data_by_id
    //         .get(&trial_id)
    //         .expect("Trial ID does not exist");

    //     // Only the creator can delete the trial
    //     assert_eq!(
    //         env::predecessor_account_id(),
    //         trial_data.creator_account_id,
    //         "Only the trial creator can delete the trial"
    //     );

    //     // Prepare the transaction to delete the trial account and transfer funds back
    //     let delete_account_action = Action::DeleteAccount(DeleteAccountAction {
    //         beneficiary_id: trial_data.creator_account_id.clone(),
    //     });

    //     let transaction = NearTransaction {
    //         signer_id: env::current_account_id(),
    //         signer_public_key: env::signer_account_pk(),
    //         nonce: U64(0),
    //         receiver_id: env::current_account_id(),
    //         block_hash: BlockHash(env::block_hash().0),
    //         actions: vec![delete_account_action],
    //     };

    //     let payload = borsh::to_vec(&transaction).unwrap();

    //     // Call the MPC contract to sign the transaction
    //     let sign_request = SignRequest {
    //         payload: payload.clone(),
    //         path: derivation_path.clone(),
    //         key_version: 0, // Update as needed
    //         chain_id: trial_data.chain_id,
    //     };

    //     Promise::new(self.mpc_contract.clone())
    //         .function_call(
    //             "sign".to_string(),
    //             near_sdk::serde_json::to_vec(&sign_request).unwrap(),
    //             0,
    //             env::prepaid_gas() - env::used_gas(),
    //         )
    //         .then(Promise::new(env::current_account_id()).function_call(
    //             "on_delete_trial".to_string(),
    //             near_sdk::serde_json::to_vec(&trial_id).unwrap(),
    //             0,
    //             env::prepaid_gas() - env::used_gas(),
    //         ));
    // }

    // /// Callback after trial deletion.
    // #[private]
    // pub fn on_delete_trial(&mut self, trial_id: TrialId) {
    //     self.trial_data_by_id.remove(&trial_id);
    // }
}
