use crate::constants::{ED25519_PUBLIC_KEY_LENGTH, SECP256K1_PUBLIC_KEY_LENGTH};
use crate::near::utils::PublicKeyStrExt;
use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Deserializer, Serialize};
use serde::de;
use serde_big_array::BigArray;
use std::io::{Error, Write};

#[derive(Serialize, Deserialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Secp256K1PublicKey(#[serde(with = "BigArray")] pub [u8; SECP256K1_PUBLIC_KEY_LENGTH]);

#[derive(Serialize, Deserialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct ED25519PublicKey(pub [u8; ED25519_PUBLIC_KEY_LENGTH]);

#[derive(Serialize, PartialEq, Eq, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum PublicKey {
    /// 256 bit elliptic curve based public-key.
    ED25519(ED25519PublicKey),
    /// 512 bit elliptic curve based public-key used in Bitcoin's public-key cryptography.
    SECP256K1(Secp256K1PublicKey),
}

impl BorshSerialize for PublicKey {
    fn serialize<W: Write>(&self, writer: &mut W) -> Result<(), Error> {
        match self {
            Self::ED25519(public_key) => {
                BorshSerialize::serialize(&0u8, writer)?;
                writer.write_all(&public_key.0)?;
            }
            Self::SECP256K1(public_key) => {
                BorshSerialize::serialize(&1u8, writer)?;
                writer.write_all(&public_key.0)?;
            }
        }
        Ok(())
    }
}

impl BorshDeserialize for PublicKey {
    fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let key_type = <u8 as BorshDeserialize>::deserialize(buf)?;
        match key_type {
            0 => Ok(Self::ED25519(
                <ED25519PublicKey as BorshDeserialize>::deserialize(buf)?,
            )),
            1 => Ok(Self::SECP256K1(
                <Secp256K1PublicKey as BorshDeserialize>::deserialize(buf)?,
            )),
            _ => Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Invalid public key type",
            )),
        }
    }

    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let key_type = u8::deserialize_reader(reader)?;
        match key_type {
            0 => Ok(Self::ED25519(ED25519PublicKey::deserialize_reader(reader)?)),
            1 => Ok(Self::SECP256K1(Secp256K1PublicKey::deserialize_reader(
                reader,
            )?)),
            _ => Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Invalid public key type",
            )),
        }
    }
}

// From implementations for fixed size arrays
impl From<[u8; SECP256K1_PUBLIC_KEY_LENGTH]> for Secp256K1PublicKey {
    fn from(data: [u8; SECP256K1_PUBLIC_KEY_LENGTH]) -> Self {
        Self(data)
    }
}

impl From<[u8; ED25519_PUBLIC_KEY_LENGTH]> for ED25519PublicKey {
    fn from(data: [u8; ED25519_PUBLIC_KEY_LENGTH]) -> Self {
        Self(data)
    }
}

// TryFrom implementations for slices and vectors
impl TryFrom<&[u8]> for PublicKey {
    type Error = String;

    fn try_from(value: &[u8]) -> Result<Self, Self::Error> {
        match value.len() {
            ED25519_PUBLIC_KEY_LENGTH => {
                Ok(Self::ED25519(ED25519PublicKey(value.try_into().unwrap())))
            }
            SECP256K1_PUBLIC_KEY_LENGTH => Ok(Self::SECP256K1(Secp256K1PublicKey(
                value.try_into().unwrap(),
            ))),
            _ => Err("Invalid public key length".to_string()),
        }
    }
}

impl TryFrom<Vec<u8>> for PublicKey {
    type Error = String;

    fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
        Self::try_from(value.as_slice())
    }
}

// Serialization
impl<'de> Deserialize<'de> for PublicKey {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct PublicKeyOrBytes;

        impl<'de> serde::de::Visitor<'de> for PublicKeyOrBytes {
            type Value = PublicKey;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a string or byte array representing a public key")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                value.to_public_key().map_err(de::Error::custom)
            }

            fn visit_map<V>(self, mut map: V) -> Result<PublicKey, V::Error>
            where
                V: de::MapAccess<'de>,
            {
                let key = map
                    .next_key::<String>()?
                    .ok_or_else(|| de::Error::missing_field("key type"))?;
                match key.as_str() {
                    "ED25519" => {
                        let bytes: Vec<u8> = map.next_value()?;
                        PublicKey::try_from(bytes.as_slice()).map_err(de::Error::custom)
                    }
                    "SECP256K1" => {
                        let bytes: Vec<u8> = map.next_value()?;
                        PublicKey::try_from(bytes.as_slice()).map_err(de::Error::custom)
                    }
                    _ => Err(de::Error::unknown_field(&key, &["ED25519", "SECP256K1"])),
                }
            }
        }

        deserializer.deserialize_any(PublicKeyOrBytes)
    }
}
