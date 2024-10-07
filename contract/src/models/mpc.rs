use crate::*;

// models.rs or types.rs
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct SignRequest {
    pub payload: [u8; 32],
    pub path: String, // Derivation path
    pub key_version: u32,
}
