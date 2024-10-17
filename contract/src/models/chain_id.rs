use crate::*;
use std::cmp::Ordering;
use std::cmp::{Ord, PartialOrd};
use std::fmt;

#[derive(Clone, Debug, Eq, PartialEq, Hash)]
#[near(serializers = [json, borsh])]
pub struct ChainId(pub String);

impl ChainId {
    pub fn is_evm(&self) -> bool {
        self.0 != "NEAR"
    }

    pub fn is_near(&self) -> bool {
        self.0 == "NEAR"
    }

    pub fn as_evm_chain_id(&self) -> Option<u64> {
        if self.is_near() {
            None
        } else {
            self.0.parse::<u64>().ok()
        }
    }
}

impl fmt::Display for ChainId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

impl From<String> for ChainId {
    fn from(s: String) -> Self {
        ChainId(s)
    }
}

impl From<&str> for ChainId {
    fn from(s: &str) -> Self {
        ChainId(s.to_string())
    }
}

// Implementing PartialOrd manually
impl PartialOrd for ChainId {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        self.0.partial_cmp(&other.0)
    }
}

// Implementing Ord manually
impl Ord for ChainId {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}
