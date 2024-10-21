// trial_creator/create.rs
use crate::*;
use hex::FromHex;
use omni_transaction::evm::types::Address;

#[near]
impl Contract {
    #[payable]
    pub fn create_trial(
        &mut self,
        chain_constraints: HashMap<String, ExtChainConstraints>,
        usage_constraints: Option<UsageConstraints>,
        interaction_limits: Option<InteractionLimits>,
        exit_conditions: Option<ExitConditions>,
        expiration_time: Option<u64>,
    ) -> TrialId {
        let creator_account_id = env::predecessor_account_id();

        let mut constraints_by_chain_id = HashMap::new();

        for (chain_id_str, ext_constraints) in chain_constraints {
            let chain_id = ChainId(chain_id_str);
            let chain_constraints = if chain_id.is_near() {
                match ext_constraints {
                    ExtChainConstraints::NEAR(near_constraints) => {
                        ChainConstraints::NEAR(near_constraints)
                    }
                    _ => env::panic_str("Chain ID and constraints type mismatch"),
                }
            } else if let Some(_chain_id_num) = chain_id.as_evm_chain_id() {
                match ext_constraints {
                    ExtChainConstraints::EVM(ext_evm_constraints) => {
                        // Process EVM constraints as before
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
                            initial_deposit: ext_evm_constraints.initial_deposit,
                        };
                        ChainConstraints::EVM(evm_constraints)
                    }
                    _ => env::panic_str("Chain ID and constraints type mismatch"),
                }
            } else {
                env::panic_str("Invalid chain ID");
            };
            constraints_by_chain_id.insert(chain_id, chain_constraints);
        }

        let trial_data = TrialData {
            constraints_by_chain_id,
            usage_constraints,
            interaction_limits,
            exit_conditions,
            expiration_time,
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
