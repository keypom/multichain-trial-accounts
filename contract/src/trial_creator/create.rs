// trial_creator/create.rs
use crate::*;
use hex::FromHex;
use omni_transaction::evm::types::Address;

#[near]
impl Contract {
    #[payable]
    pub fn create_trial(
        &mut self,
        initial_deposit: NearToken,
        chain_constraints: HashMap<String, ExtChainConstraints>,
        usage_constraints: Option<UsageConstraints>,
        interaction_limits: Option<InteractionLimits>,
        exit_conditions: Option<ExitConditions>,
        expiration_time: Option<u64>,
    ) -> TrialId {
        // Parse the String keys into ChainId
        let chain_constraints_parsed: HashMap<ChainId, ExtChainConstraints> = chain_constraints
            .into_iter()
            .map(|(k, v)| {
                let chain_id = match k.as_str() {
                    "NEAR" => ChainId::NEAR,
                    _ => {
                        if let Ok(num) = k.parse::<u64>() {
                            ChainId::EVM(num)
                        } else {
                            env::panic_str(&format!("Invalid chain ID: {}", k));
                        }
                    }
                };
                (chain_id, v)
            })
            .collect();

        let creator_account_id = env::predecessor_account_id();

        let mut constraints_by_chain_id = HashMap::new();
        for (chain_id, ext_constraints) in chain_constraints_parsed {
            let chain_constraints = match (chain_id.clone(), ext_constraints) {
                (ChainId::NEAR, ExtChainConstraints::NEAR(near_constraints)) => {
                    ChainConstraints::NEAR(near_constraints)
                }
                (ChainId::EVM(_), ExtChainConstraints::EVM(ext_evm_constraints)) => {
                    // Convert allowed_contracts from Vec<String> to Vec<Address>
                    let allowed_addresses = ext_evm_constraints
                        .allowed_contracts
                        .iter()
                        .map(|addr_str| {
                            let addr_str = addr_str.trim_start_matches("0x");
                            let addr_bytes: [u8; 20] = <[u8; 20]>::from_hex(addr_str)
                                .expect("Invalid Ethereum address in allowed_contracts");
                            Address::from(addr_bytes)
                        })
                        .collect();
                    let evm_constraints = EvmConstraints {
                        allowed_methods: ext_evm_constraints.allowed_methods,
                        allowed_contracts: allowed_addresses,
                        max_gas: ext_evm_constraints.max_gas,
                        max_value: ext_evm_constraints.max_value,
                    };
                    ChainConstraints::EVM(evm_constraints)
                }
                _ => {
                    env::panic_str("Chain ID and constraints type mismatch");
                }
            };
            constraints_by_chain_id.insert(chain_id, chain_constraints);
        }

        let trial_data = TrialData {
            constraints_by_chain_id,
            usage_constraints,
            interaction_limits,
            exit_conditions,
            expiration_time,
            initial_deposit,
            creator_account_id: creator_account_id.clone(),
        };

        let initial_storage = env::storage_usage();

        self.trial_nonce += 1;
        let trial_id = self.trial_nonce;

        self.trial_data_by_id.insert(trial_id, trial_data);
        self.trial_data_by_id.flush();

        self.adjust_deposit(initial_storage, env::storage_usage());

        env::log_str(&format!(
            "Trial {} created by {}",
            trial_id, creator_account_id
        ));

        trial_id
    }
}
