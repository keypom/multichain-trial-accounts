// usage_tracking.rs
use crate::*;

#[near]
impl Contract {
    /// Internal method to assert if a key is allowed to perform an action.
    fn assert_action_allowed(
        &mut self,
        method_name: &str,
        contract_id: &AccountId,
        gas_attached: NearGas,
        deposit_attached: U128,
    ) -> (TrialData, KeyUsage) {
        let public_key = env::signer_account_pk();

        // Fetch KeyUsage
        let mut key_usage = self
            .key_usage_by_pk
            .get(&public_key)
            .expect("Access denied");

        // Fetch TrialData
        let trial_data = self
            .trial_data_by_id
            .get(&key_usage.trial_id)
            .expect("Trial data not found");

        // Check expiration time
        if let Some(expiration_time) = trial_data.expiration_time {
            assert!(
                env::block_timestamp() < expiration_time,
                "Trial period has expired"
            );
        }

        // Check allowed methods
        if !trial_data
            .allowed_methods
            .contains(&method_name.to_string())
        {
            env::panic_str("Method not allowed");
        }

        // Check allowed contracts
        if !trial_data.allowed_contracts.contains(contract_id) {
            env::panic_str("Contract not allowed");
        }

        // Check gas and deposit limits
        if let Some(max_gas) = trial_data.max_gas {
            assert!(
                gas_attached.0 <= max_gas,
                "Attached gas exceeds maximum allowed"
            );
        }
        if let Some(max_deposit) = trial_data.max_deposit {
            assert!(
                deposit_attached.0 <= max_deposit.0,
                "Attached deposit exceeds maximum allowed"
            );
        }

        // Update usage statistics
        key_usage.usage_stats.total_interactions += 1;
        key_usage.usage_stats.gas_used += gas_attached.0;
        key_usage.usage_stats.deposit_used.0 += deposit_attached.0;

        // Update the key usage
        self.key_usage_by_pk.insert(&public_key, &key_usage);

        (trial_data, key_usage)
    }

    /// Public method to perform an action after all validations.
    pub fn perform_action(
        &mut self,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: NearGas,
        deposit: U128,
    ) {
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

        // All checks passed, proceed to call the MPC contract
        self.call_mpc_contract(
            contract_id,
            method_name,
            args,
            gas,
            deposit,
            trial_data.chain_id,
        );
    }

    /// Internal method to call the MPC contract.
    fn call_mpc_contract(
        &self,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: NearGas,
        deposit: U128,
        chain_id: u64,
    ) {
        let mpc_contract = self.mpc_contract.clone();

        // Build the NEAR transaction
        let tx = TransactionBuilder::new::<NEAR>()
            .signer_id(env::current_account_id())
            .signer_public_key(env::signer_account_pk().into())
            .nonce(0) // Replace with appropriate nonce
            .receiver_id(contract_id.clone())
            .block_hash(env::block_hash().into())
            .actions(vec![Action::FunctionCall(Box::new(FunctionCallAction {
                method_name: method_name.clone(),
                args: args.clone(),
                gas: gas.into(),
                deposit: deposit.into(),
            }))])
            .build();

        let payload = tx.build_for_signing();

        // Prepare the sign request
        let sign_request = SignRequest {
            payload,
            path: method_name.clone(),
            key_version: 0, // Assuming version 0 for simplicity
            chain_id,
        };

        // Call the MPC contract to get a signature
        Promise::new(mpc_contract).function_call(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&sign_request).unwrap(),
            0,
            env::prepaid_gas() - env::used_gas(),
        );
    }
}
