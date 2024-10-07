use crate::*;

#[near]
impl Contract {
    /// View function to get trial data by trial ID
    pub fn get_trial_data(&self, trial_id: TrialId) -> Option<TrialData> {
        self.trial_data_by_id.get(&trial_id).cloned()
    }

    /// View function to get key usage by public key
    pub fn get_key_usage(&self, public_key: PublicKey) -> Option<KeyUsage> {
        self.key_usage_by_pk.get(&public_key).cloned()
    }
}
