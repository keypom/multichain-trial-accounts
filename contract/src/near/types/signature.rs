use borsh::{BorshDeserialize, BorshSerialize};
use bs58;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt::Debug;

use crate::constants::{COMPONENT_SIZE, SECP256K1_SIGNATURE_LENGTH};

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub enum Signature {
    ED25519(ED25519Signature),
    SECP256K1(Secp256K1Signature),
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct ED25519Signature {
    pub r: ComponentBytes,
    pub s: ComponentBytes,
}

/// Size of an `R` or `s` component of an Ed25519 signature when serialized as bytes.
pub type ComponentBytes = [u8; COMPONENT_SIZE];

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct Secp256K1Signature(pub [u8; SECP256K1_SIGNATURE_LENGTH]);

impl Serialize for Signature {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::ED25519(sig) => {
                let mut bytes = Vec::with_capacity(COMPONENT_SIZE * 2);
                bytes.extend_from_slice(&sig.r);
                bytes.extend_from_slice(&sig.s);

                let encoded = bs58::encode(&bytes).into_string();
                serializer.serialize_str(&format!("ed25519:{}", encoded))
            }
            Self::SECP256K1(sig) => {
                let encoded = bs58::encode(&sig.0).into_string();
                serializer.serialize_str(&format!("secp256k1:{}", encoded))
            }
        }
    }
}

impl<'de> Deserialize<'de> for Signature {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s: String = Deserialize::deserialize(deserializer)?;
        let (key_type, sig_data) = s.split_at(
            s.find(':')
                .ok_or_else(|| serde::de::Error::custom("Invalid signature format"))?,
        );
        let sig_data = &sig_data[1..]; // Skip the colon

        match key_type {
            "ed25519" => {
                let bytes = bs58::decode(sig_data)
                    .into_vec()
                    .map_err(serde::de::Error::custom)?;

                let signature = ED25519Signature {
                    r: bytes[0..COMPONENT_SIZE]
                        .try_into()
                        .map_err(serde::de::Error::custom)?,
                    s: bytes[COMPONENT_SIZE..]
                        .try_into()
                        .map_err(serde::de::Error::custom)?,
                };
                Ok(Self::ED25519(signature))
            }
            "secp256k1" => {
                let bytes = bs58::decode(sig_data)
                    .into_vec()
                    .map_err(serde::de::Error::custom)?;

                if bytes.len() != SECP256K1_SIGNATURE_LENGTH {
                    return Err(serde::de::Error::custom(
                        "Invalid SECP256K1 signature length",
                    ));
                }

                let mut array = [0u8; SECP256K1_SIGNATURE_LENGTH];
                array.copy_from_slice(&bytes);
                Ok(Self::SECP256K1(Secp256K1Signature(array)))
            }
            _ => Err(serde::de::Error::custom("Unknown key type")),
        }
    }
}
