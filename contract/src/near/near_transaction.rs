use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{borsh, AccountId};

use super::types::{Action, BlockHash, PublicKey, Signature, U64};

#[derive(Serialize, Deserialize, Debug, Clone, BorshSerialize, BorshDeserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct NearTransaction {
    /// An account on which behalf transaction is signed
    pub signer_id: AccountId,
    /// A public key of the access key which was used to sign an account.
    /// Access key holds permissions for calling certain kinds of actions.
    pub signer_public_key: PublicKey,
    /// Nonce is used to determine order of transaction in the pool.
    /// It increments for a combination of `signer_id` and `public_key`
    pub nonce: U64,
    /// Receiver account for this transaction
    pub receiver_id: AccountId,
    /// The hash of the block in the blockchain on top of which the given transaction is valid
    pub block_hash: BlockHash,
    /// A list of actions to be applied
    pub actions: Vec<Action>,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SignedTransaction {
    pub transaction: NearTransaction,
    pub signature: Signature,
}

impl NearTransaction {
    pub fn build_for_signing(&self) -> Vec<u8> {
        borsh::to_vec(self).expect("failed to serialize NEAR transaction")
    }

    pub fn build_with_signature(&self, signature: Signature) -> Vec<u8> {
        let signed_tx = SignedTransaction {
            transaction: self.clone(),
            signature,
        };
        borsh::to_vec(&signed_tx).expect("failed to serialize NEAR transaction")
    }

    pub fn from_json(json: &str) -> Result<Self, near_sdk::serde_json::Error> {
        near_sdk::serde_json::from_str(json)
    }
}
