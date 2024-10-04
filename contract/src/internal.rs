// internal.rs
use crate::*;

#[near]
impl Contract {
    pub(crate) fn adjust_deposit(&self, initial_storage: u64, final_storage: u64) {
        // Measure the storage difference
        let storage_used = final_storage as i64 - initial_storage as i64;
        let storage_byte_cost = env::storage_byte_cost();

        // If more storage was used (storage_used is positive), calculate the required deposit
        if storage_used > 0 {
            let required_deposit = storage_byte_cost
                .checked_mul(storage_used as u128)
                .expect("Overflow");
            let attached_deposit = env::attached_deposit();

            assert!(
                attached_deposit >= required_deposit,
                "Insufficient deposit: required {} yoctoNEAR",
                required_deposit
            );

            // Refund any excess deposit
            let refund = attached_deposit.checked_sub(required_deposit);
            if let Some(refund) = refund {
                Promise::new(env::predecessor_account_id()).transfer(refund);
            }
        }
        // If storage was freed up (storage_used is negative), calculate the refund
        else if storage_used < 0 {
            let refund_amount = storage_byte_cost
                .checked_mul((-storage_used) as u128)
                .expect("Overflow");

            // Transfer the refund for freed storage
            Promise::new(env::predecessor_account_id()).transfer(refund_amount);
        }
    }
}
