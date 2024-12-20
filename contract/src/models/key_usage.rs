use near_sdk::json_types::U128;
use omni_transaction::evm::types::Address;

// models/key_usage.rs
use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
#[serde(untagged)]
pub enum UserAccountId {
    NEAR(AccountId),
    EVM(Address),
}

/// Tracks usage statistics for trial accounts.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UsageStats {
    pub total_interactions: u64,
    pub interactions_per_day: HashMap<u64, u64>, // Day timestamp to interaction count
    pub methods_called: HashMap<String, u64>,    // method_name to count
    pub contracts_called: HashMap<String, u64>,  // contract_id or address to count
    pub gas_used: u128,
    pub deposit_used: U128, // For NEAR, represents yoctoNEAR; for EVM, represents wei
}
// Implement default for UsageStats
impl Default for UsageStats {
    fn default() -> Self {
        Self {
            interactions_per_day: HashMap::new(),
            total_interactions: 0,
            methods_called: HashMap::new(),
            contracts_called: HashMap::new(),
            gas_used: 0,
            deposit_used: U128(0),
        }
    }
}

/// Associates a public key with its usage stats and trial ID.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct KeyUsage {
    pub trial_id: TrialId,
    pub mpc_key: PublicKey,
    pub account_id_by_chain_id: HashMap<ChainId, UserAccountId>,
    pub usage_stats: UsageStats,
}

/// Structure representing a key with both a public key and MPC key
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct KeyWithMPC {
    pub public_key: PublicKey,
    pub mpc_key: PublicKey,
}
