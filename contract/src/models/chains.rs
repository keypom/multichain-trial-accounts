use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub enum Chain {
    NEAR,
    Ethereum,
}
