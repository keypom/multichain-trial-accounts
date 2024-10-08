// models/key_usage.rs
use crate::*;

/// Tracks usage statistics for trial accounts.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UsageStats {
    pub interactions_per_day: HashMap<u64, u64>, // Day timestamp to interaction count
    pub total_interactions: u64,
    pub methods_called: HashMap<String, u64>, // method_name to count
    pub contracts_called: HashMap<AccountId, u64>, // contract_id to count
    pub gas_used: Gas,
    pub deposit_used: NearToken,
}
// Implement default for UsageStats
impl Default for UsageStats {
    fn default() -> Self {
        Self {
            interactions_per_day: HashMap::new(),
            total_interactions: 0,
            methods_called: HashMap::new(),
            contracts_called: HashMap::new(),
            gas_used: Gas::from_gas(0),
            deposit_used: NearToken::from_yoctonear(0),
        }
    }
}

/// Associates a public key with its usage stats and trial ID.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct KeyUsage {
    pub trial_id: TrialId,
    pub mpc_key: PublicKey,
    pub account_id: Option<AccountId>,
    pub usage_stats: UsageStats,
}

/// Structure representing a key with both a public key and MPC key
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct KeyWithMPC {
    pub public_key: PublicKey,
    pub mpc_key: PublicKey,
}
