// utils.rs

use crate::*;
use near_sdk::{env, CurveType, PublicKey};
use omni_transaction::near::types::{
    ED25519PublicKey as OmniEd25519PublicKey, PublicKey as OmniPublicKey,
    Secp256K1PublicKey as OmniSECP256K1PublicKey,
};
use sha2::{Digest, Sha256};

/// Converts a NEAR `PublicKey` to an OmniTransaction `PublicKey`.
pub fn convert_pk_to_omni(pk: &PublicKey) -> OmniPublicKey {
    // First byte is the curve type
    let curve_type = pk.curve_type();

    // Remaining bytes are the actual public key data
    let public_key_data = &pk.as_bytes()[1..];

    match curve_type {
        CurveType::ED25519 => {
            if public_key_data.len() == ED25519_PUBLIC_KEY_LENGTH {
                let ed25519_key: [u8; ED25519_PUBLIC_KEY_LENGTH] = public_key_data
                    .try_into()
                    .expect("Failed to convert ED25519 public key");

                OmniPublicKey::ED25519(OmniEd25519PublicKey::from(ed25519_key))
            } else {
                env::panic_str("Invalid ED25519 public key length");
            }
        }
        CurveType::SECP256K1 => {
            if public_key_data.len() == SECP256K1_PUBLIC_KEY_LENGTH {
                let secp256k1_key: [u8; SECP256K1_PUBLIC_KEY_LENGTH] = public_key_data
                    .try_into()
                    .expect("Failed to convert SECP256K1 public key");

                OmniPublicKey::SECP256K1(OmniSECP256K1PublicKey::from(secp256k1_key))
            } else {
                env::panic_str("Invalid SECP256K1 public key length");
            }
        }
    }
}

/// Converts a `PublicKey` to a string representation.
pub fn public_key_to_string(public_key: &PublicKey) -> String {
    let curve_type = public_key.curve_type();
    let encoded = bs58::encode(&public_key.as_bytes()[1..]).into_string(); // Skipping the first byte which is the curve type
    match curve_type {
        CurveType::ED25519 => format!("ed25519:{}", encoded),
        CurveType::SECP256K1 => format!("secp256k1:{}", encoded),
    }
}

/// Hashes a payload using SHA256 and returns a 32-byte array.
pub fn hash_payload(payload: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(payload);
    let result = hasher.finalize();
    result.into() // Converts the resulting hash into a [u8; 32] array
}

/// Creates a sign request from a hashed payload and public key.
pub fn create_sign_request_from_transaction(
    hashed_payload: [u8; 32],
    path: &PublicKey,
) -> serde_json::Value {
    // Create the sign request with the hashed payload
    let sign_request = SignRequest {
        payload: hashed_payload.to_vec(), // Convert [u8; 32] to Vec<u8>
        path: public_key_to_string(path),
        key_version: 0, // Modify this as needed
    };

    // Wrap the sign request into the expected structure
    serde_json::json!({ "request": sign_request })
}

#[near]
impl Contract {
    pub(crate) fn adjust_deposit(&self, initial_storage: u64, final_storage: u64) {
        // Measure the storage difference
        let storage_used = final_storage as i64 - initial_storage as i64;
        let storage_byte_cost = env::storage_byte_cost();

        // If more storage was used (storage_used is positive), calculate the required deposit
        if storage_used > 0 {
            let required_deposit = storage_byte_cost
                .checked_mul(storage_used as u128)
                .expect("Overflow");
            let attached_deposit = env::attached_deposit();

            assert!(
                attached_deposit >= required_deposit,
                "Insufficient deposit: required {} yoctoNEAR",
                required_deposit
            );

            // Refund any excess deposit
            let refund = attached_deposit.checked_sub(required_deposit);
            if let Some(refund) = refund {
                Promise::new(env::predecessor_account_id()).transfer(refund);
            }
        }
        // If storage was freed up (storage_used is negative), calculate the refund
        else if storage_used < 0 {
            let refund_amount = storage_byte_cost
                .checked_mul((-storage_used) as u128)
                .expect("Overflow");

            // Transfer the refund for freed storage
            Promise::new(env::predecessor_account_id()).transfer(refund_amount);
        }
    }
}
