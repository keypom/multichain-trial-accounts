use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Deserializer, Serialize};
use serde::de;
use serde_big_array::BigArray;

#[derive(Serialize, Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
#[serde(crate = "near_sdk::serde")]
pub struct BlockHash(#[serde(with = "BigArray")] pub [u8; 32]);

impl From<[u8; 32]> for BlockHash {
    fn from(data: [u8; 32]) -> Self {
        Self(data)
    }
}

impl<'de> Deserialize<'de> for BlockHash {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct BlockHashOrBytes;

        impl<'de> serde::de::Visitor<'de> for BlockHashOrBytes {
            type Value = BlockHash;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a string or byte array representing a block hash")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                let bytes = bs58::decode(value).into_vec().map_err(de::Error::custom)?;
                let array: [u8; 32] = bytes
                    .try_into()
                    .map_err(|_| de::Error::custom("Invalid length"))?;

                Ok(BlockHash(array))
            }

            fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
            where
                A: de::SeqAccess<'de>,
            {
                let mut arr = [0u8; 32];
                for (i, elem) in arr.iter_mut().enumerate() {
                    *elem = seq
                        .next_element()?
                        .ok_or_else(|| de::Error::invalid_length(i, &self))?;
                }
                Ok(BlockHash(arr))
            }
        }

        deserializer.deserialize_any(BlockHashOrBytes)
    }
}
