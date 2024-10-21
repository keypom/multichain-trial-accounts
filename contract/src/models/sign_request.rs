// models/sign_request.rs
use crate::*;

/// Represents a sign request sent to the MPC contract.
#[derive(Clone)]
#[near(serializers = [json])]
pub struct SignRequest {
    pub payload: Vec<u8>,
    pub path: String, // Derivation path
    pub key_version: u32,
}

#[near(serializers = [json])]
pub struct SignResult {
    pub big_r: AffinePoint,
    pub s: Scalar,
    pub recovery_id: u8,
}

#[near(serializers = [json])]
pub struct AffinePoint {
    pub affine_point: String,
}

#[near(serializers = [json])]
pub struct Scalar {
    pub scalar: String,
}

#[near(serializers = [json])]
pub struct FinalizedTxnData {
    pub signature: SignResult,
    pub txn: Vec<u8>,
}
