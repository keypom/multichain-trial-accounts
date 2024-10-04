// trial_management/create_trial.rs
use crate::*;

#[near]
impl Contract {
    /// Creates a new trial with specified parameters.
    #[payable]
    pub fn create_trial(
        &mut self,
        allowed_methods: Vec<String>,
        allowed_contracts: Vec<AccountId>,
        max_gas: Option<u64>,
        max_deposit: Option<U128>,
        usage_constraints: Option<UsageConstraints>,
        interaction_limits: Option<InteractionLimits>,
        exit_conditions: Option<ExitConditions>,
        expiration_time: Option<u64>,
        chain_id: u64,
    ) -> TrialId {
        let creator_account_id = env::predecessor_account_id();

        let trial_data = TrialData {
            allowed_methods,
            allowed_contracts,
            max_gas,
            max_deposit,
            usage_constraints,
            interaction_limits,
            exit_conditions,
            expiration_time,
            chain_id,
            creator_account_id,
        };

        let initial_storage = env::storage_usage();

        self.trial_nonce += 1;
        let trial_id = self.trial_nonce;

        self.trial_data_by_id.insert(&trial_id, &trial_data);

        self.adjust_deposit(initial_storage, env::storage_usage());

        trial_id
    }
}
