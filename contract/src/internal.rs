// internal.rs
use crate::*;

use near_sdk::CurveType;
use omni_transaction::near::{
    near_transaction::NearTransaction,
    types::{
        ED25519PublicKey as OmniEd25519PublicKey, Secp256K1PublicKey as OmniSecp256K1PublicKey,
    },
};
use sha2::{Digest, Sha256};

pub fn convert_pk_to_omni(pk: PublicKey) -> OmniPublicKey {
    // First byte is the curve type
    let curve_type = pk.as_bytes()[0];

    // Remaining bytes are the actual public key data
    let public_key_data = &pk.as_bytes()[1..];

    // Match the curve type and convert the public key accordingly
    match curve_type {
        0 => {
            // ED25519 key (32 bytes expected)
            if public_key_data.len() == ED25519_PUBLIC_KEY_LENGTH {
                let ed25519_key: [u8; ED25519_PUBLIC_KEY_LENGTH] = public_key_data
                    .try_into()
                    .expect("Failed to convert ED25519 public key");

                OmniPublicKey::ED25519(OmniEd25519PublicKey::from(ed25519_key))
            } else {
                env::panic_str("Invalid ED25519 public key length");
            }
        }
        1 => {
            // SECP256K1 key (64 bytes expected)
            if public_key_data.len() == SECP256K1_PUBLIC_KEY_LENGTH {
                let secp256k1_key: [u8; SECP256K1_PUBLIC_KEY_LENGTH] = public_key_data
                    .try_into()
                    .expect("Failed to convert SECP256K1 public key");

                OmniPublicKey::SECP256K1(OmniSecp256K1PublicKey::from(secp256k1_key))
            } else {
                env::panic_str("Invalid SECP256K1 public key length");
            }
        }
        _ => {
            env::panic_str("Unsupported curve type");
        }
    }
}

pub fn public_key_to_string(public_key: &PublicKey) -> String {
    let curve_type = public_key.curve_type();
    let encoded = bs58::encode(&public_key.as_bytes()[1..]).into_string(); // Skipping the first byte which is the curve type
    match curve_type {
        CurveType::ED25519 => format!("ed25519:{}", encoded),
        CurveType::SECP256K1 => format!("secp256k1:{}", encoded),
    }
}

// Helper function to hash a payload to 32 bytes
fn hash_payload(payload: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(payload);
    let result = hasher.finalize();
    result.into() // Converts the resulting hash into a [u8; 32] array
}

// Main helper function to create the sign request
pub fn create_sign_request_from_transaction(
    tx: NearTransaction,
    public_key: PublicKey,
) -> serde_json::Value {
    // Build the transaction to get the payload
    let payload_vec = tx.build_for_signing();

    // Hash the payload
    let hashed_payload = hash_payload(&payload_vec);

    // Create the sign request with the hashed payload
    let sign_request = SignRequest {
        payload: hashed_payload, // Convert [u8; 32] to Vec<u8> for SignRequest
        path: public_key_to_string(&public_key), // Assuming public_key_to_string is defined somewhere
        key_version: 0,                          // Modify this as needed
    };

    // Wrap the sign request into the expected structure
    let request_payload = serde_json::json!({ "request": sign_request });

    request_payload
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
