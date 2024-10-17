// key_management/add_keys.rs
use crate::*;

#[near]
impl Contract {
    /// Associates public keys with a trial account in batch.
    /// Takes an array of objects containing both the public key and the corresponding MPC key.
    #[payable]
    pub fn add_trial_keys(&mut self, keys: Vec<KeyWithMPC>, trial_id: TrialId) {
        let trial_data = self
            .trial_data_by_id
            .get(&trial_id)
            .expect("Trial ID does not exist");

        // Only the creator can add keys to their trial
        require!(
            env::predecessor_account_id() == trial_data.creator_account_id,
            "Only the trial creator can add keys"
        );

        let initial_storage = env::storage_usage();

        // Iterate through each object containing the public key and the MPC key
        for key_with_mpc in keys.iter() {
            let public_key = &key_with_mpc.public_key;
            let mpc_key = &key_with_mpc.mpc_key;

            // Create the key usage for the trial
            let key_usage = KeyUsage {
                trial_id,
                account_id_by_chain_id: HashMap::new(),
                mpc_key: mpc_key.clone(),
                usage_stats: UsageStats::default(),
            };

            // Store the public key in the trial data
            self.key_usage_by_pk.insert(public_key.clone(), key_usage);

            // Add the access key to the contract with limited permissions
            Promise::new(env::current_account_id()).add_access_key_allowance(
                public_key.clone(),
                Allowance::Unlimited, // Set allowance as needed
                env::current_account_id(),
                TRIAL_ACCESS_KEY_METHODS.to_string(),
            );
        }

        self.key_usage_by_pk.flush();
        // Adjust the deposit based on storage usage
        self.adjust_deposit(initial_storage, env::storage_usage());
    }
}
