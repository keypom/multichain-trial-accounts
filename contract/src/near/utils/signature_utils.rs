use crate::{
    constants::{ED25519_SIGNATURE_LENGTH, SECP256K1_SIGNATURE_LENGTH},
    near::types::{ED25519Signature, Secp256K1Signature, Signature},
};
use bs58;
use std::convert::TryInto;

pub trait SignatureStrExt {
    fn to_signature(&self) -> Result<Signature, String>;
    fn to_signature_as_bytes(&self) -> Result<Vec<u8>, String>;
    fn try_ed25519_into_bytes(&self) -> Result<[u8; ED25519_SIGNATURE_LENGTH], String>;
    fn try_secp256k1_into_bytes(&self) -> Result<[u8; SECP256K1_SIGNATURE_LENGTH], String>;
    fn to_ed25519_signature(&self) -> Result<ED25519Signature, String>;
    fn to_secp256k1_signature(&self) -> Result<Secp256K1Signature, String>;
}

impl SignatureStrExt for str {
    fn to_signature(&self) -> Result<Signature, String> {
        let bytes = self.to_signature_as_bytes()?;
        if self.starts_with("ed25519:") {
            Ok(Signature::ED25519(ED25519Signature {
                r: bytes[..32]
                    .try_into()
                    .map_err(|_| "Invalid length for ED25519 signature".to_string())?,
                s: bytes[32..]
                    .try_into()
                    .map_err(|_| "Invalid length for ED25519 signature".to_string())?,
            }))
        } else if self.starts_with("secp256k1:") {
            Ok(Signature::SECP256K1(Secp256K1Signature(
                bytes
                    .try_into()
                    .map_err(|_| "Invalid length for SECP256K1 signature".to_string())?,
            )))
        } else {
            Err("Unknown key type".into())
        }
    }

    fn to_signature_as_bytes(&self) -> Result<Vec<u8>, String> {
        let (key_type, key_data) = self
            .split_once(':')
            .ok_or_else(|| "Invalid key format".to_string())?;

        let bytes = bs58::decode(key_data)
            .into_vec()
            .map_err(|e| format!("Failed to decode base58: {}", e))?;

        match key_type {
            "ed25519" => {
                if bytes.len() == ED25519_SIGNATURE_LENGTH {
                    Ok(bytes)
                } else {
                    Err("ED25519 public key should be 32 bytes long".to_string())
                }
            }
            "secp256k1" => {
                if bytes.len() == SECP256K1_SIGNATURE_LENGTH {
                    Ok(bytes)
                } else {
                    Err("SECP256K1 public key should be 64 bytes long".to_string())
                }
            }
            _ => Err("Unknown key type".into()),
        }
    }

    fn try_ed25519_into_bytes(&self) -> Result<[u8; ED25519_SIGNATURE_LENGTH], String> {
        let bytes = self.to_signature_as_bytes()?;
        if bytes.len() == ED25519_SIGNATURE_LENGTH {
            Ok(bytes.try_into().unwrap())
        } else {
            Err("Invalid length for ED25519 signature".to_string())
        }
    }

    fn try_secp256k1_into_bytes(&self) -> Result<[u8; SECP256K1_SIGNATURE_LENGTH], String> {
        let bytes = self.to_signature_as_bytes()?;
        if bytes.len() == SECP256K1_SIGNATURE_LENGTH {
            Ok(bytes.try_into().unwrap())
        } else {
            Err("Invalid length for SECP256K1 signature".to_string())
        }
    }

    fn to_ed25519_signature(&self) -> Result<ED25519Signature, String> {
        let bytes = self.try_ed25519_into_bytes()?;
        Ok(ED25519Signature {
            r: bytes[..32]
                .try_into()
                .map_err(|_| "Invalid length for r".to_string())?,
            s: bytes[32..]
                .try_into()
                .map_err(|_| "Invalid length for s".to_string())?,
        })
    }

    fn to_secp256k1_signature(&self) -> Result<Secp256K1Signature, String> {
        let bytes = self.try_secp256k1_into_bytes()?;
        Ok(Secp256K1Signature(bytes))
    }
}
