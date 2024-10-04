// types.rs
#[cfg(feature = "bitcoin")]
pub mod bitcoin_transaction_builder;

#[cfg(feature = "evm")]
pub mod evm_transaction_builder;

#[cfg(feature = "near")]
pub mod near_transaction_builder;

#[cfg(feature = "near")]
pub type NEAR = near_transaction_builder::NearTransactionBuilder;

#[cfg(feature = "evm")]
pub type EVM = evm_transaction_builder::EVMTransactionBuilder;

#[cfg(feature = "bitcoin")]
pub type BITCOIN = bitcoin_transaction_builder::BitcoinTransactionBuilder;
