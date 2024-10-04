// transaction_builder.rs
pub trait TxBuilder<T> {
    fn build(&self) -> T;
}

pub struct TransactionBuilder;

impl TransactionBuilder {
    #[allow(clippy::new_ret_no_self)]
    pub fn new<T>() -> T
    where
        T: Default,
    {
        T::default()
    }
}
