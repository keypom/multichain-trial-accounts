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
pub enum SerializableToken {
    Address([u8; 20]),
    FixedBytes(Vec<u8>),
    Bytes(Vec<u8>),
    Int(String), // Use String to avoid large integer serialization issues
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
            SerializableToken::Address(bytes) => Token::Address(Address::from_slice(&bytes)),
            SerializableToken::FixedBytes(data) => Token::FixedBytes(data),
            SerializableToken::Bytes(data) => Token::Bytes(data),
            SerializableToken::Int(s) => {
                let value = s.parse::<U256>().expect("Invalid Int value");
                Token::Int(value)
            }
            SerializableToken::Uint(s) => {
                let value = s.parse::<U256>().expect("Invalid Uint value");
                Token::Uint(value)
            }
            SerializableToken::Bool(b) => Token::Bool(b),
            SerializableToken::String(s) => Token::String(s),
            SerializableToken::FixedArray(tokens) => {
                Token::FixedArray(tokens.into_iter().map(|t| t.into()).collect())
            }
            SerializableToken::Array(tokens) => {
                Token::Array(tokens.into_iter().map(|t| t.into()).collect())
            }
            SerializableToken::Tuple(tokens) => {
                Token::Tuple(tokens.into_iter().map(|t| t.into()).collect())
            }
        }
    }
}
