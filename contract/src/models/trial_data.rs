// models/trial_data.rs
use crate::*;
use omni_transaction::evm::types::Address;
use std::collections::HashMap;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct TrialData {
    pub constraints_by_chain_id: HashMap<ChainId, ChainConstraints>,
    pub usage_constraints: Option<UsageConstraints>,
    pub interaction_limits: Option<InteractionLimits>,
    pub exit_conditions: Option<ExitConditions>,
    pub expiration_time: Option<u64>,
    pub creator_account_id: AccountId,
}

impl TrialData {
    /// Retrieves the chain constraints for a given chain ID.
    pub fn get_chain_constraints(&self, chain_id: &ChainId) -> Option<&ChainConstraints> {
        self.constraints_by_chain_id.get(chain_id)
    }

    /// Checks if a method is allowed on a given chain.
    pub fn is_method_allowed(&self, method: &str, chain_id: &ChainId) -> bool {
        if let Some(chain_constraints) = self.get_chain_constraints(chain_id) {
            match chain_constraints {
                ChainConstraints::NEAR(constraints) => {
                    constraints.allowed_methods.contains(&method.to_string())
                }
                ChainConstraints::EVM(constraints) => {
                    constraints.allowed_methods.contains(&method.to_string())
                }
            }
        } else {
            false
        }
    }

    /// Checks if a contract is allowed on a given chain.
    pub fn is_contract_allowed(&self, contract: &str, chain_id: &ChainId) -> bool {
        if let Some(chain_constraints) = self.get_chain_constraints(chain_id) {
            match chain_constraints {
                ChainConstraints::NEAR(constraints) => constraints
                    .allowed_contracts
                    .contains(&contract.parse().unwrap()),
                ChainConstraints::EVM(constraints) => {
                    // Assuming contract is a hex string representing the address
                    let addr_str = contract.trim_start_matches("0x");
                    let addr_bytes: [u8; 20] = match hex::decode(addr_str) {
                        Ok(bytes) => bytes.try_into().expect("Invalid Ethereum address length"),
                        Err(_) => {
                            return false;
                        }
                    };
                    let address = Address::from(addr_bytes);
                    constraints.allowed_contracts.contains(&address)
                }
            }
        } else {
            false
        }
    }

    /// Checks if the gas limit is within allowed limits.
    pub fn is_gas_within_limits(&self, gas: u64, chain_id: &ChainId) -> bool {
        if let Some(chain_constraints) = self.get_chain_constraints(chain_id) {
            match chain_constraints {
                ChainConstraints::NEAR(constraints) => {
                    if let Some(max_gas) = constraints.max_gas {
                        gas <= max_gas.as_gas()
                    } else {
                        true
                    }
                }
                ChainConstraints::EVM(constraints) => {
                    if let Some(max_gas) = constraints.max_gas {
                        gas <= max_gas
                    } else {
                        true
                    }
                }
            }
        } else {
            false
        }
    }

    /// Checks if the attached deposit/value is within allowed limits.
    pub fn is_deposit_within_limits(&self, deposit: u128, chain_id: &ChainId) -> bool {
        if let Some(chain_constraints) = self.get_chain_constraints(chain_id) {
            match chain_constraints {
                ChainConstraints::NEAR(constraints) => {
                    if let Some(max_deposit) = constraints.max_deposit {
                        deposit <= max_deposit.as_yoctonear()
                    } else {
                        true
                    }
                }
                ChainConstraints::EVM(constraints) => {
                    if let Some(max_value) = &constraints.max_value {
                        deposit <= max_value.0
                    } else {
                        true
                    }
                }
            }
        } else {
            false
        }
    }

    /// Checks if the trial has expired.
    pub fn has_expired(&self, current_timestamp: u64) -> bool {
        if let Some(expiration_time) = self.expiration_time {
            current_timestamp >= expiration_time
        } else {
            false
        }
    }

    /// Checks if the transaction limit has been reached.
    pub fn is_within_transaction_limit(&self, total_interactions: u64) -> bool {
        if let Some(exit_conditions) = &self.exit_conditions {
            if let Some(transaction_limit) = exit_conditions.transaction_limit {
                total_interactions < transaction_limit
            } else {
                true
            }
        } else {
            true
        }
    }
}
