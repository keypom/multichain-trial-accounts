use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct ExtTrialData {
    pub constraints_by_chain_id: HashMap<ChainId, ExtChainConstraints>,
    pub usage_constraints: Option<UsageConstraints>,
    pub interaction_limits: Option<InteractionLimits>,
    pub exit_conditions: Option<ExitConditions>,
    pub expiration_time: Option<u64>,
    pub initial_deposit: NearToken,
    pub creator_account_id: AccountId,
}

/// Associates a public key with its usage stats and trial ID.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct TrialAccountInfo {
    pub trial_id: TrialId,
    pub trial_data: ExtTrialData,
    pub mpc_key: PublicKey,
    pub account_id_by_chain_id: HashMap<ChainId, String>,
    pub usage_stats: UsageStats,
}

/// Associates a public key with its usage stats and trial ID.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct ExtKeyUsage {
    pub trial_id: TrialId,
    pub mpc_key: PublicKey,
    pub account_id_by_chain_id: HashMap<ChainId, String>,
    pub usage_stats: UsageStats,
}

#[near]
impl Contract {
    /// View function to get trial data by trial ID
    pub fn get_trial_data(&self, trial_id: TrialId) -> Option<TrialData> {
        self.trial_data_by_id.get(&trial_id).cloned()
    }

    /// View function to get key usage by public key
    pub fn get_key_usage(&self, public_key: PublicKey) -> Option<ExtKeyUsage> {
        self.key_usage_by_pk
            .get(&public_key)
            .cloned()
            .map(|key_usage| {
                let mut account_id_by_chain_id = HashMap::new();
                for (chain_id, account_id) in key_usage.account_id_by_chain_id.iter() {
                    match account_id {
                        UserAccountId::EVM(addr) => {
                            account_id_by_chain_id
                                .insert(chain_id.clone(), convert_address_to_hex_string(addr));
                        }
                        UserAccountId::NEAR(acc_id) => {
                            account_id_by_chain_id.insert(chain_id.clone(), acc_id.to_string());
                        }
                    }
                }

                ExtKeyUsage {
                    trial_id: key_usage.trial_id,
                    mpc_key: key_usage.mpc_key,
                    account_id_by_chain_id,
                    usage_stats: key_usage.usage_stats,
                }
            })
    }

    pub fn get_trial_account_info(&self, public_key: PublicKey) -> Option<TrialAccountInfo> {
        self.key_usage_by_pk.get(&public_key).and_then(|key_usage| {
            let trial_id = key_usage.trial_id;
            self.trial_data_by_id.get(&trial_id).map(|trial_data| {
                let trial_data_converted = trial_data_to_ext_trial_data(trial_data.clone());
                let mut account_id_by_chain_id = HashMap::new();
                for (chain_id, account_id) in key_usage.account_id_by_chain_id.iter() {
                    match account_id {
                        UserAccountId::EVM(addr) => {
                            account_id_by_chain_id
                                .insert(chain_id.clone(), convert_address_to_hex_string(addr));
                        }
                        UserAccountId::NEAR(acc_id) => {
                            account_id_by_chain_id.insert(chain_id.clone(), acc_id.to_string());
                        }
                    }
                }

                TrialAccountInfo {
                    trial_id,
                    trial_data: trial_data_converted,
                    mpc_key: key_usage.mpc_key.clone(),
                    account_id_by_chain_id,
                    usage_stats: key_usage.usage_stats.clone(),
                }
            })
        })
    }
}
