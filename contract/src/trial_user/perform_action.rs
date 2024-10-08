// usage_tracking/usage_stats.rs
use crate::*;

#[near]
impl Contract {
    /// Internal method to assert if a key is allowed to perform an action.
    fn assert_action_allowed(
        &mut self,
        method_name: &str,
        contract_id: &AccountId,
        gas_attached: Gas,
        deposit_attached: NearToken,
    ) -> (TrialData, KeyUsage) {
        let public_key = env::signer_account_pk();

        // Fetch KeyUsage
        let key_usage = self
            .key_usage_by_pk
            .get_mut(&public_key)
            .expect("Access denied");

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

        // Check allowed methods
        if !trial_data.is_method_allowed(method_name) {
            env::panic_str("Method not allowed");
        }

        // Check allowed contracts
        if !trial_data.is_contract_allowed(contract_id) {
            env::panic_str("Contract not allowed");
        }

        // Check gas and deposit limits
        if let Some(max_gas) = trial_data.max_gas {
            require!(
                gas_attached <= max_gas,
                "Attached gas exceeds maximum allowed"
            );
        }
        if let Some(max_deposit) = trial_data.max_deposit {
            require!(
                deposit_attached <= max_deposit,
                "Attached deposit exceeds maximum allowed"
            );
        }

        // Update usage statistics
        key_usage.usage_stats.total_interactions += 1;
        key_usage.usage_stats.gas_used = key_usage
            .usage_stats
            .gas_used
            .checked_add(gas_attached)
            .expect("Gas overflow");

        key_usage.usage_stats.deposit_used = key_usage
            .usage_stats
            .deposit_used
            .checked_add(deposit_attached)
            .expect("Deposit overflow");

        (trial_data.clone(), key_usage.clone())
    }

    /// Public method to perform an action after all validations.
    pub fn perform_action(
        &mut self,
        chain: Chain,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: Gas,
        deposit: NearToken,
        nonce: U64,
        block_hash: Base58CryptoHash,
    ) -> Promise {
        let (trial_data, key_usage) =
            self.assert_action_allowed(&method_name, &contract_id, gas, deposit);

        // Check exit conditions if any
        if let Some(exit_conditions) = &trial_data.exit_conditions {
            // Check transaction limit
            if let Some(transaction_limit) = exit_conditions.transaction_limit {
                if key_usage.usage_stats.total_interactions > transaction_limit {
                    env::panic_str("Transaction limit reached");
                }
            }
            // Additional exit conditions can be checked here
        }

        // All checks passed, proceed to call the chain-specific contract
        match chain {
            Chain::NEAR => self.call_near_contract(
                contract_id,
                method_name,
                args,
                gas,
                deposit,
                env::signer_account_pk(),
                key_usage.mpc_key,
                key_usage.account_id.clone().unwrap(),
                trial_data.chain_id,
                nonce,
                block_hash,
            ),
            Chain::Ethereum => {
                // Implement Ethereum contract call
                self.call_ethereum_contract(
                    contract_id,
                    method_name,
                    args,
                    gas,
                    deposit,
                    key_usage.mpc_key,
                    trial_data.chain_id,
                )
            }
        }
    }
}
