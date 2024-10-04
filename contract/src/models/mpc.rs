use crate::*;

// models.rs or types.rs
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SignRequest {
    pub payload: Vec<u8>,
    pub path: String, // Derivation path
    pub key_version: u32,
    pub chain_id: u64,
}
