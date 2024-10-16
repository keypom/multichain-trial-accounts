use crate::perform_actions::serialization::{SerializableParam, SerializableToken};
use crate::*;
use ethabi::{Function, Param, StateMutability, Token};
use hex::FromHex;
use near_sdk::json_types::U128;
use omni_transaction::evm::evm_transaction_builder::EVMTransactionBuilder;
use omni_transaction::evm::types::{AccessList, Address};
use omni_transaction::transaction_builder::TxBuilder;

#[near]
impl Contract {
    pub fn call_evm_contract(
        &mut self,
        chain_id: u64,
        contract_address: String,
        method_name: String,
        method_params: Vec<SerializableParam>,
        args: Vec<SerializableToken>,
        gas_limit: u128,
        value: U128,
        nonce: u64,
        max_fee_per_gas: u128,
        max_priority_fee_per_gas: u128,
        access_list: AccessList,
    ) -> Promise {
        // Parse the contract address
        let addr_str = contract_address.trim_start_matches("0x");
        let addr_bytes: [u8; 20] =
            <[u8; 20]>::from_hex(addr_str).expect("Invalid Ethereum address in allowed_contracts");
        let contract_address = Address::from(addr_bytes);

        let action = Action::EVM(EvmAction {
            chain_id,
            method_name: method_name.clone(),
            contract_address: contract_address.clone(),
            gas_limit,
            value,
        });

        let (trial_data, key_usage) = self.assert_action_allowed(&action);

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

        // Convert SerializableParamType to ethabi::ParamType
        let ethabi_params: Vec<Param> = method_params.into_iter().map(|p| p.into()).collect();

        // Convert SerializableToken to ethabi::Token
        let ethabi_args: Vec<Token> = args.into_iter().map(|t| t.into()).collect();

        // Build the function object
        let function = Function {
            name: method_name.clone(),
            inputs: ethabi_params,
            outputs: vec![], // Adjust if needed
            constant: Some(false),
            state_mutability: StateMutability::NonPayable,
        };

        // Encode the function call data
        let input_data = function
            .encode_input(&ethabi_args)
            .expect("Failed to encode input");

        // Build the EVM transaction
        let evm_transaction = EVMTransactionBuilder::new()
            .chain_id(chain_id)
            .nonce(nonce)
            .max_priority_fee_per_gas(max_priority_fee_per_gas)
            .max_fee_per_gas(max_fee_per_gas)
            .gas_limit(gas_limit)
            .to(contract_address)
            .value(value.0)
            .input(input_data)
            .access_list(access_list)
            .build();

        let tx_bytes = evm_transaction.build_for_signing();

        // Compute the hash of the serialized transaction
        let hashed_payload = hash_payload(&tx_bytes);

        // Log the details
        env::log_str(&format!(
            "Calling EVM contract {:?} with method {:?}. Hash: {:?}",
            contract_address, method_name, hashed_payload
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
