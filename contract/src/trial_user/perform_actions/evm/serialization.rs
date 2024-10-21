use ethabi::{Address, Param, ParamType, Token};
use ethereum_types::U256;
use std::str::FromStr;

use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct SerializableParam {
    pub name: String,
    pub kind: SerializableParamType,
}

// Define SerializableParamType
#[derive(Clone)]
#[near(serializers = [json, borsh])]
#[serde(tag = "type", content = "value")]
pub enum SerializableParamType {
    Address,
    Bytes,
    Int(usize),
    Uint(usize),
    Bool,
    String,
    Array(Box<SerializableParamType>),
    FixedBytes(usize),
    FixedArray(Box<SerializableParamType>, usize),
    Tuple(Vec<SerializableParamType>),
}

// Define SerializableToken
#[derive(Clone)]
#[near(serializers = [json, borsh])]
#[serde(tag = "type", content = "value")]
pub enum SerializableToken {
    Address(String),    // Changed from [u8; 20] to String
    FixedBytes(String), // Changed to String to accept hex string
    Bytes(String),      // Changed to String to accept hex string
    Int(String),        // Use String to avoid large integer serialization issues
    Uint(String),
    Bool(bool),
    String(String),
    FixedArray(Vec<SerializableToken>),
    Array(Vec<SerializableToken>),
    Tuple(Vec<SerializableToken>),
}

impl From<SerializableParam> for Param {
    fn from(sp: SerializableParam) -> Self {
        Param {
            name: sp.name,
            kind: sp.kind.into(),
            internal_type: None,
        }
    }
}

impl From<SerializableParamType> for ParamType {
    fn from(spt: SerializableParamType) -> Self {
        match spt {
            SerializableParamType::Address => ParamType::Address,
            SerializableParamType::Bytes => ParamType::Bytes,
            SerializableParamType::Int(size) => ParamType::Int(size),
            SerializableParamType::Uint(size) => ParamType::Uint(size),
            SerializableParamType::Bool => ParamType::Bool,
            SerializableParamType::String => ParamType::String,
            SerializableParamType::Array(inner) => ParamType::Array(Box::new((*inner).into())),
            SerializableParamType::FixedBytes(size) => ParamType::FixedBytes(size),
            SerializableParamType::FixedArray(inner, size) => {
                ParamType::FixedArray(Box::new((*inner).into()), size)
            }
            SerializableParamType::Tuple(inner) => {
                ParamType::Tuple(inner.into_iter().map(|p| p.into()).collect())
            }
        }
    }
}

impl From<SerializableToken> for Token {
    fn from(st: SerializableToken) -> Self {
        match st {
            // Handle Address parsing
            SerializableToken::Address(s) => {
                env::log_str(&format!("Incoming Address value: {}", s));
                let s = s.trim_start_matches("0x");
                let bytes = hex::decode(s).expect("Invalid Address value");
                if bytes.len() != 20 {
                    panic!("Address must be 20 bytes");
                }
                env::log_str(&format!("Parsed Address value: {:?}", bytes));
                Token::Address(Address::from_slice(&bytes))
            }
            // Handle FixedBytes parsing
            SerializableToken::FixedBytes(s) => {
                env::log_str(&format!("Incoming FixedBytes value: {}", s));
                let s = s.trim_start_matches("0x");
                let bytes = hex::decode(s).expect("Invalid FixedBytes value");
                env::log_str(&format!("Parsed FixedBytes value: {:?}", bytes));
                Token::FixedBytes(bytes)
            }
            // Handle Bytes parsing
            SerializableToken::Bytes(s) => {
                env::log_str(&format!("Incoming Bytes value: {}", s));
                let s = s.trim_start_matches("0x");
                let bytes = hex::decode(s).expect("Invalid Bytes value");
                env::log_str(&format!("Parsed Bytes value: {:?}", bytes));
                Token::Bytes(bytes)
            }
            // Handle Int parsing
            SerializableToken::Int(s) => {
                env::log_str(&format!("Incoming Int value: {}", s));
                let value = if s.starts_with("0x") {
                    U256::from_str_radix(&s[2..], 16).expect("Invalid Int value")
                } else {
                    U256::from_str_radix(&s, 10).expect("Invalid Int value")
                };
                // Convert U256 to signed integer (assuming 256-bit signed integer)
                let int_value = ethabi::Int::from(value);
                env::log_str(&format!("Parsed Int value: {:?}", int_value));
                Token::Int(int_value)
            }
            // Handle Uint parsing
            SerializableToken::Uint(s) => {
                env::log_str(&format!("Incoming Uint value: {}", s));
                let value = if s.starts_with("0x") {
                    U256::from_str_radix(&s[2..], 16).expect("Invalid Uint value")
                } else {
                    U256::from_str_radix(&s, 10).expect("Invalid Uint value")
                };
                env::log_str(&format!("Parsed Uint value: {}", value));
                Token::Uint(value)
            }
            SerializableToken::Bool(b) => Token::Bool(b),
            SerializableToken::String(s) => Token::String(s),
            // Handle FixedArray recursively
            SerializableToken::FixedArray(tokens) => {
                Token::FixedArray(tokens.into_iter().map(|t| t.into()).collect())
            }
            // Handle Array recursively
            SerializableToken::Array(tokens) => {
                Token::Array(tokens.into_iter().map(|t| t.into()).collect())
            }
            // Handle Tuple recursively
            SerializableToken::Tuple(tokens) => {
                Token::Tuple(tokens.into_iter().map(|t| t.into()).collect())
            }
        }
    }
}
