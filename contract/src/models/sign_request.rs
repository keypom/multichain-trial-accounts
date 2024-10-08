// models/sign_request.rs
use crate::*;

/// Represents a sign request sent to the MPC contract.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct SignRequest {
    pub payload: Vec<u8>,
    pub path: String, // Derivation path
    pub key_version: u32,
}
