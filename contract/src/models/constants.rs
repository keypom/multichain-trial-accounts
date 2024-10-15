// models/constants.rs
/// Access key methods name for trial accounts
pub const TRIAL_ACCESS_KEY_METHODS: &str =
    "create_trial,activate_trial,delete_trial,add_trial_keys,call_evm_contract,call_near_contract,exit_trial";

/// Length of an Ed25519 public key
pub const ED25519_PUBLIC_KEY_LENGTH: usize = 32;

/// Length of a SECP256K1 public key
pub const SECP256K1_PUBLIC_KEY_LENGTH: usize = 64;

/// Type alias for Trial IDs
pub type TrialId = u32;
