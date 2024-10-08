// trial/delete.rs
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
        require!(
            env::predecessor_account_id() == trial_data.creator_account_id,
            "Only the trial creator can delete the trial"
        );

        let initial_storage = env::storage_usage();
        self.trial_data_by_id.remove(&trial_id);
        self.trial_data_by_id.flush();

        self.adjust_deposit(initial_storage, env::storage_usage());

        env::log_str(&format!(
            "Trial {} deleted by {}",
            trial_id,
            env::predecessor_account_id()
        ));
    }

    //TODO: add a function to refund unused trials
}
