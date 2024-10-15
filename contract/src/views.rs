use crate::*;

/// Associates a public key with its usage stats and trial ID.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct TrialAccountInfo {
    pub trial_id: TrialId,
    pub trial_data: TrialData,
    pub mpc_key: PublicKey,
    pub account_id: Option<AccountId>,
    pub usage_stats: UsageStats,
}

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

    pub fn get_trial_account_info(&self, public_key: PublicKey) -> Option<TrialAccountInfo> {
        self.key_usage_by_pk.get(&public_key).and_then(|key_usage| {
            let trial_id = key_usage.trial_id;
            self.trial_data_by_id
                .get(&trial_id)
                .map(|trial_data| TrialAccountInfo {
                    trial_id,
                    trial_data: trial_data.clone(),
                    mpc_key: key_usage.mpc_key.clone(),
                    account_id: key_usage.account_id.clone(),
                    usage_stats: key_usage.usage_stats.clone(),
                })
        })
    }
}
