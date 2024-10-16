// trial_user/perform_actions/action_checker.rs
use crate::*;
use near_sdk::json_types::U128;

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
        if trial_data.has_expired(env::block_timestamp()) {
            env::panic_str("Trial period has expired");
        }

        // Now check action-specific constraints
        match action {
            Action::NEAR(near_action) => {
                let chain_id = ChainId::NEAR;

                // Check if the method is allowed
                if !trial_data.is_method_allowed(&near_action.method_name, &chain_id) {
                    env::panic_str("Method not allowed");
                }

                // Check if the contract is allowed
                if !trial_data.is_contract_allowed(near_action.contract_id.as_str(), &chain_id) {
                    env::panic_str("Contract not allowed");
                }

                // Check gas limit
                if !trial_data.is_gas_within_limits(near_action.gas_attached.as_gas(), &chain_id) {
                    env::panic_str("Attached gas exceeds maximum allowed");
                }

                // Check deposit limit
                if !trial_data.is_deposit_within_limits(
                    near_action.deposit_attached.as_yoctonear(),
                    &chain_id,
                ) {
                    env::panic_str("Attached deposit exceeds maximum allowed");
                }

                // Update usage statistics
                key_usage.usage_stats.total_interactions += 1;
                key_usage.usage_stats.gas_used = key_usage
                    .usage_stats
                    .gas_used
                    .checked_add(near_action.gas_attached.as_gas() as u128)
                    .expect("Gas overflow");

                key_usage.usage_stats.deposit_used = U128(
                    key_usage
                        .usage_stats
                        .deposit_used
                        .0
                        .checked_add(near_action.deposit_attached.as_yoctonear())
                        .expect("Deposit overflow"),
                );
            }
            Action::EVM(evm_action) => {
                let chain_id = ChainId::EVM(evm_action.chain_id);

                // Check if the method is allowed
                if !trial_data.is_method_allowed(&evm_action.method_name, &chain_id) {
                    env::panic_str("Method not allowed");
                }

                // Convert contract address to hex string
                let contract_address_hex =
                    format!("0x{}", hex::encode(evm_action.contract_address));

                // Check if the contract is allowed
                if !trial_data.is_contract_allowed(&contract_address_hex, &chain_id) {
                    env::panic_str("Contract not allowed");
                }

                // Check gas limit
                if !trial_data.is_gas_within_limits(evm_action.gas_limit as u64, &chain_id) {
                    env::panic_str("Gas limit exceeds maximum allowed");
                }

                // Check value limit
                if !trial_data.is_deposit_within_limits(evm_action.value.0, &chain_id) {
                    env::panic_str("Value exceeds maximum allowed");
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
            }
        }

        // Update key usage in storage
        self.key_usage_by_pk.insert(public_key, key_usage.clone());

        (trial_data.clone(), key_usage)
    }
}
