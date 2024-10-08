// trial/exit.rs
use crate::*;

#[near]
impl Contract {
    /// Allows a trial user to exit the trial, adding a full access key to their account.
    pub fn exit_trial(&mut self, public_key: PublicKey) -> Promise {
        let signer_pk = env::signer_account_pk();
        let key_usage = self.key_usage_by_pk.get(&signer_pk).expect("Access denied");

        let trial_data = self
            .trial_data_by_id
            .get(&key_usage.trial_id)
            .expect("Trial data not found");

        // TODO:
        // Build the transaction to add a full access key
        // Implement the logic to add a full access key using the MPC contract

        env::panic_str("Exit trial functionality is not yet implemented");
    }
}
