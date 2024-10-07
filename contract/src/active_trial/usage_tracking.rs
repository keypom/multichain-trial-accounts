use near_sdk::json_types::Base58CryptoHash;

// usage_tracking.rs
use crate::*;

#[near]
impl Contract {
    /// Internal method to assert if a key is allowed to perform an action.
    fn assert_action_allowed(
        &mut self,
        method_name: &str,
        contract_id: &AccountId,
        gas_attached: Gas,
        deposit_attached: U128,
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
                gas_attached.as_gas() <= max_gas,
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
        key_usage.usage_stats.gas_used += gas_attached.as_gas();
        key_usage.usage_stats.deposit_used.0 += deposit_attached.0;

        (trial_data.clone(), key_usage.clone())
    }

    /// Public method to perform an action after all validations.
    pub fn perform_action(
        &mut self,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: Gas,
        deposit: U128,
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

        // All checks passed, proceed to call the MPC contract
        self.call_mpc_contract(
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
        )
        .as_return()
    }

    // Modify `call_mpc_contract` to accept nonce and block_hash
    fn call_mpc_contract(
        &self,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: Gas,
        deposit: U128,
        public_key: PublicKey,
        mpc_key: PublicKey,
        mpc_account_id: AccountId,
        chain_id: u64,
        nonce: U64,
        block_hash: Base58CryptoHash,
    ) -> Promise {
        let actions = vec![OmniAction::FunctionCall(Box::new(OmniFunctionCallAction {
            method_name: method_name.clone(),
            args: args.clone(),
            gas: OmniU64(gas.as_gas()),
            deposit: OmniU128(deposit.into()),
        }))];

        // Log the details to compare with the transaction built in the JS code
        near_sdk::log!(
            "Signer: {:?}, Contract: {:?}, Method: {:?}, Args: {:?}, Gas: {:?}, Deposit: {:?}, Public Key: {:?}, MPC Key: {:?}, MPC Account: {:?}, Chain ID: {}, Nonce: {:?}, Block Hash: {:?}, Actions: {:?}",
            mpc_account_id,
            contract_id,
            method_name,
            args,
            gas,
            deposit,
            public_key,
            mpc_key,
            mpc_account_id,
            chain_id,
            nonce,
            block_hash,
            actions
        );

        // Build the NEAR transaction
        let tx = TransactionBuilder::new::<NEAR>()
            .signer_id(mpc_account_id.to_string())
            .signer_public_key(convert_pk_to_omni(mpc_key))
            .nonce(nonce.0) // Use the provided nonce
            .receiver_id(contract_id.clone().to_string())
            .block_hash(OmniBlockHash(block_hash.into()))
            .actions(actions)
            .build();

        let request_payload = create_sign_request_from_transaction(tx, public_key); // Call the helper

        // Call the MPC contract to get a signature
        Promise::new(self.mpc_contract.clone())
            .function_call_weight(
                "sign".to_string(),
                near_sdk::serde_json::to_vec(&request_payload).unwrap(), // Serialize with the correct structure
                NearToken::from_near(1),
                Gas::from_tgas(30),
                GasWeight(1),
            )
            .as_return()
    }
}
