use near_sdk::json_types::U128;

use crate::*;

#[near]
impl Contract {
    pub(crate) fn assert_action_allowed(&mut self, action: &Action) -> (TrialData, KeyUsage) {
        let public_key = env::signer_account_pk();

        // Fetch KeyUsage
        let mut key_usage = self
            .key_usage_by_pk
            .get(&public_key)
            .expect("Access denied")
            .clone();

        // Fetch TrialData
        let trial_data = self
            .trial_data_by_id
            .get(&key_usage.trial_id)
            .cloned()
            .expect("Trial data not found");

        // Check expiration time
        if let Some(expiration_time) = trial_data.expiration_time {
            require!(
                env::block_timestamp() < expiration_time,
                "Trial period has expired"
            );
        }

        // Now check action-specific constraints
        match action {
            Action::NEAR(near_action) => {
                // Ensure chain constraints are NEAR constraints
                if let ChainConstraints::NEAR(near_constraints) = &trial_data.chain_constraints {
                    // Check allowed methods
                    if !near_constraints
                        .allowed_methods
                        .contains(&near_action.method_name)
                    {
                        env::panic_str("Method not allowed");
                    }

                    // Check allowed contracts
                    if !near_constraints
                        .allowed_contracts
                        .contains(&near_action.contract_id)
                    {
                        env::panic_str("Contract not allowed");
                    }

                    // Check gas and deposit limits
                    if let Some(max_gas) = near_constraints.max_gas {
                        require!(
                            near_action.gas_attached <= max_gas,
                            "Attached gas exceeds maximum allowed"
                        );
                    }
                    if let Some(max_deposit) = near_constraints.max_deposit {
                        require!(
                            near_action.deposit_attached <= max_deposit,
                            "Attached deposit exceeds maximum allowed"
                        );
                    }

                    // Update usage statistics
                    key_usage.usage_stats.total_interactions += 1;
                    key_usage.usage_stats.gas_used = key_usage
                        .usage_stats
                        .gas_used
                        .checked_add(near_action.gas_attached.as_gas().into())
                        .expect("Gas overflow");

                    key_usage.usage_stats.deposit_used = U128(
                        key_usage
                            .usage_stats
                            .deposit_used
                            .0
                            .checked_add(near_action.deposit_attached.as_yoctonear())
                            .expect("Deposit overflow"),
                    );
                } else {
                    env::panic_str("Chain constraints mismatch for NEAR action");
                }
            }
            Action::EVM(evm_action) => {
                // Ensure chain constraints are EVM constraints
                if let ChainConstraints::EVM(evm_constraints) = &trial_data.chain_constraints {
                    // Check allowed methods
                    if !evm_constraints
                        .allowed_methods
                        .contains(&evm_action.method_name)
                    {
                        env::panic_str("Method not allowed");
                    }

                    // Check allowed contracts
                    if !evm_constraints
                        .allowed_contracts
                        .contains(&evm_action.contract_address)
                    {
                        env::panic_str("Contract not allowed");
                    }

                    // Check gas and value limits
                    if let Some(max_gas) = evm_constraints.max_gas {
                        require!(
                            evm_action.gas_limit <= max_gas.into(),
                            "Gas limit exceeds maximum allowed"
                        );
                    }
                    if let Some(max_value) = &evm_constraints.max_value {
                        require!(
                            evm_action.value.0 <= max_value.0,
                            "Value exceeds maximum allowed"
                        );
                    }

                    // Update usage statistics
                    key_usage.usage_stats.total_interactions += 1;
                    key_usage.usage_stats.gas_used = key_usage
                        .usage_stats
                        .gas_used
                        .checked_add(evm_action.gas_limit)
                        .expect("Gas overflow");

                    key_usage.usage_stats.deposit_used = U128(
                        key_usage
                            .usage_stats
                            .deposit_used
                            .0
                            .checked_add(evm_action.value.0)
                            .expect("Value overflow"),
                    );
                } else {
                    env::panic_str("Chain constraints mismatch for EVM action");
                }
            }
        }

        // Update key usage in storage
        self.key_usage_by_pk.insert(public_key, key_usage.clone());

        (trial_data.clone(), key_usage)
    }
}
