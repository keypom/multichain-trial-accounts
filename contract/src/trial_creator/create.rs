// trial/create.rs
use crate::*;

#[near]
impl Contract {
    /// Creates a new trial with specified parameters.
    ///
    /// # Arguments
    ///
    /// * `allowed_methods` - A list of method names that are allowed in the trial.
    /// * `allowed_contracts` - A list of contracts that can be interacted with during the trial.
    /// * `initial_deposit` - The initial deposit amount in NEAR tokens.
    ///
    /// # Returns
    ///
    /// Returns the unique identifier for the newly created trial.
    #[payable]
    pub fn create_trial(
        &mut self,
        initial_deposit: NearToken,
        chain_constraints: ChainConstraints,
        usage_constraints: Option<UsageConstraints>,
        interaction_limits: Option<InteractionLimits>,
        exit_conditions: Option<ExitConditions>,
        expiration_time: Option<u64>,
        chain_id: u64,
    ) -> TrialId {
        let creator_account_id = env::predecessor_account_id();

        let trial_data = TrialData {
            chain_constraints,
            usage_constraints,
            interaction_limits,
            exit_conditions,
            expiration_time,
            initial_deposit,
            chain_id,
            creator_account_id,
        };

        let initial_storage = env::storage_usage();

        self.trial_nonce += 1;
        let trial_id = self.trial_nonce;

        self.trial_data_by_id.insert(trial_id, trial_data);
        self.trial_data_by_id.flush();

        self.adjust_deposit(initial_storage, env::storage_usage());

        env::log_str(&format!(
            "Trial {} created by {}",
            trial_id,
            env::predecessor_account_id()
        ));

        trial_id
    }
}
