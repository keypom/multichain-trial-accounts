// usage_tracking/usage_stats.rs
use crate::*;

#[near]
impl Contract {
    /// Calls a NEAR contract via the MPC contract.
    pub fn call_near_contract(
        &mut self,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: Gas,
        deposit: NearToken,
        nonce: U64,
        block_hash: Base58CryptoHash,
    ) -> Promise {
        let action = Action::NEAR(NearAction {
            method_name: method_name.clone(),
            contract_id: contract_id.clone(),
            gas_attached: gas,
            deposit_attached: deposit,
        });

        let (trial_data, key_usage) = self.assert_action_allowed(&action);
        let mpc_key = key_usage.mpc_key;
        let account_id = key_usage.account_id.expect("Trial Account not activated");

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

        let actions = vec![OmniAction::FunctionCall(Box::new(OmniFunctionCallAction {
            method_name: method_name.clone(),
            args: args.clone(),
            gas: OmniU64(gas.as_gas()),
            deposit: OmniU128(deposit.as_yoctonear()),
        }))];

        // Build the NEAR transaction
        let tx = TransactionBuilder::new::<NEAR>()
            .signer_id(account_id.clone().to_string())
            .signer_public_key(convert_pk_to_omni(&mpc_key))
            .nonce(nonce.0) // Use the provided nonce
            .receiver_id(contract_id.clone().to_string())
            .block_hash(OmniBlockHash(block_hash.into()))
            .actions(actions.clone())
            .build()
            .build_for_signing();

        // Compute the SHA-256 hash of the serialized transaction
        let hashed_payload = hash_payload(&tx);

        // Log the details
        env::log_str(&format!(
            "Calling NEAR contract {:?} with method {:?}. Hash: {:?}"
            contract_id, method_name, hashed_payload
        ));

        let request_payload =
            create_sign_request_from_transaction(hashed_payload, &env::signer_account_pk());

        // Call the MPC contract to get a signature
        Promise::new(self.mpc_contract.clone())
            .function_call_weight(
                "sign".to_string(),
                near_sdk::serde_json::to_vec(&request_payload).unwrap(),
                NearToken::from_near(1),
                Gas::from_tgas(30),
                GasWeight(1),
            )
            .as_return()
    }
}
