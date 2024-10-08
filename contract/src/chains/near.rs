// chains/near.rs
use crate::*;

#[near]
impl Contract {
    /// Calls a NEAR contract via the MPC contract.
    pub(crate) fn call_near_contract(
        &self,
        contract_id: AccountId,
        method_name: String,
        args: Vec<u8>,
        gas: Gas,
        deposit: NearToken,
        path: PublicKey,
        signing_key: PublicKey,
        mpc_account_id: AccountId,
        chain_id: u64,
        nonce: U64,
        block_hash: Base58CryptoHash,
    ) -> Promise {
        let actions = vec![OmniAction::FunctionCall(Box::new(OmniFunctionCallAction {
            method_name: method_name.clone(),
            args: args.clone(),
            gas: OmniU64(gas.as_gas()),
            deposit: OmniU128(deposit.as_yoctonear()),
        }))];

        // Build the NEAR transaction
        let tx = TransactionBuilder::new::<NEAR>()
            .signer_id(mpc_account_id.to_string())
            .signer_public_key(convert_pk_to_omni(&signing_key))
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
            "Calling NEAR contract {:?} with method {:?}",
            contract_id, method_name
        ));

        let request_payload = create_sign_request_from_transaction(hashed_payload, &path);

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
