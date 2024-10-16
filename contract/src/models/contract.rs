use std::cmp::Ordering;
use std::hash::{Hash, Hasher};

use crate::*;

/// Storage keys for the contract's collections.
#[near]
#[derive(BorshStorageKey)]
pub enum StorageKeys {
    TrialDataById,
    KeyUsageByPK,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[near(serializers = [json, borsh])]
pub enum ChainId {
    NEAR,
    EVM(u64),
}

// Implement Hash for ChainId
impl Hash for ChainId {
    fn hash<H: Hasher>(&self, state: &mut H) {
        match self {
            ChainId::NEAR => {
                state.write_u8(0);
            }
            ChainId::EVM(value) => {
                state.write_u8(1);
                value.hash(state);
            }
        }
    }
}

// Implement Ord and PartialOrd for ChainId
impl Ord for ChainId {
    fn cmp(&self, other: &Self) -> Ordering {
        match (self, other) {
            (ChainId::NEAR, ChainId::NEAR) => Ordering::Equal,
            (ChainId::NEAR, _) => Ordering::Less,
            (_, ChainId::NEAR) => Ordering::Greater,
            (ChainId::EVM(a), ChainId::EVM(b)) => a.cmp(b),
        }
    }
}

impl PartialOrd for ChainId {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
