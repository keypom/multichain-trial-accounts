// trial_management/add_keys.rs
use crate::*;

#[near]
impl Contract {
    /// Associates public keys with a trial account in batch.
    #[payable]
    pub fn add_trial_keys(&mut self, public_keys: Vec<PublicKey>, trial_id: TrialId) {
        let trial_data = self
            .trial_data_by_id
            .get(&trial_id)
            .expect("Trial ID does not exist");

        // Only the creator can add keys to their trial
        assert_eq!(
            env::predecessor_account_id(),
            trial_data.creator_account_id,
            "Only the trial creator can add keys"
        );

        let initial_storage = env::storage_usage();

        for public_key in public_keys.iter() {
            let key_usage = KeyUsage {
                trial_id,
                usage_stats: UsageStats::default(),
            };

            self.key_usage_by_pk.insert(public_key, &key_usage);

            // Add the access key to the contract with limited permissions
            Promise::new(env::current_account_id()).add_access_key_allowance(
                public_key.clone(),
                Allowance::Unlimited, // Set allowance as needed
                env::current_account_id(),
                TRIAL_ACCESS_KEY_METHODS.to_string(),
            );
        }

        self.adjust_deposit(initial_storage, env::storage_usage());
    }
}
