// near/near_transaction_builder.rs
use super::{
    near_transaction::NearTransaction,
    types::{Action, BlockHash, PublicKey, U64},
};
use crate::transaction_builder::TxBuilder;

#[derive(Default)]
pub struct NearTransactionBuilder {
    pub signer_id: Option<String>,
    pub signer_public_key: Option<PublicKey>,
    pub nonce: Option<u64>,
    pub receiver_id: Option<String>,
    pub block_hash: Option<BlockHash>,
    pub actions: Option<Vec<Action>>,
}

impl TxBuilder<NearTransaction> for NearTransactionBuilder {
    fn build(&self) -> NearTransaction {
        NearTransaction {
            signer_id: self
                .signer_id
                .clone()
                .expect("Missing signer ID")
                .parse()
                .unwrap(),
            signer_public_key: self
                .signer_public_key
                .clone()
                .expect("Missing signer public key"),
            nonce: U64(self.nonce.expect("Missing nonce")),
            receiver_id: self
                .receiver_id
                .clone()
                .expect("Missing receiver ID")
                .parse()
                .unwrap(),
            block_hash: self.block_hash.clone().expect("Missing block hash"),
            actions: self.actions.clone().expect("Missing actions"),
        }
    }
}

impl NearTransactionBuilder {
    pub fn signer_id(mut self, signer_id: String) -> Self {
        self.signer_id = Some(signer_id);
        self
    }

    pub fn signer_public_key(mut self, signer_public_key: PublicKey) -> Self {
        self.signer_public_key = Some(signer_public_key);
        self
    }

    pub fn nonce(mut self, nonce: u64) -> Self {
        self.nonce = Some(nonce);
        self
    }

    pub fn receiver_id(mut self, receiver_id: String) -> Self {
        self.receiver_id = Some(receiver_id);
        self
    }

    pub fn block_hash(mut self, block_hash: BlockHash) -> Self {
        self.block_hash = Some(block_hash);
        self
    }

    pub fn actions(mut self, actions: Vec<Action>) -> Self {
        self.actions = Some(actions);
        self
    }
}
