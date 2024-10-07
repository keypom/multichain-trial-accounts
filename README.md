# Keypom Trial Accounts Contract

Welcome to the **Keypom Trial Accounts** repository. This project provides both a NEAR smart contract and an accompanying NPM package for managing trial accounts. It allows developers to create limited-access trial accounts with specific constraints and exit conditions, enabling fine-grained control over account permissions, usage tracking, and automated transitions from trial to full accounts.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Contract Structure](#contract-structure)
- [Usage](#usage)
  - [Initializing the Contract](#initializing-the-contract)
  - [Creating a Trial](#creating-a-trial)
  - [Adding Trial Keys](#adding-trial-keys)
  - [Performing Actions](#performing-actions)
  - [Exiting a Trial](#exiting-a-trial)
  - [Deleting a Trial](#deleting-a-trial)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)
- [Additional Notes](#additional-notes)

## Overview

The **Keypom Trial Accounts Contract** allows developers to create and manage trial accounts on the NEAR blockchain. Trial accounts have limited permissions and can be configured with various constraints such as allowed methods, contracts, gas usage, deposit limits, and exit conditions. This contract facilitates:

- Creation and deletion of trial accounts.
- Adding and managing access keys with specific permissions.
- Tracking usage statistics and enforcing constraints.
- Transitioning trial accounts to full accounts upon meeting exit conditions.

## Features

- **Trial Management**: Create, update, and delete trial accounts with customizable parameters.
- **Access Control**: Add access keys with restricted permissions to trial accounts.
- **Usage Tracking**: Monitor usage statistics like gas used, deposit amounts, and method calls.
- **Exit Conditions**: Define conditions under which a trial account can be upgraded or exited.
- **Integration with MPC**: Interact with a Multi-Party Computation (MPC) contract for secure key management.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Rust](https://www.rust-lang.org/tools/install) (version >= 1.60.0)
- [NEAR CLI](https://docs.near.org/tools/near-cli#setup)
- [Yarn](https://classic.yarnpkg.com/en/docs/install) or [npm](https://www.npmjs.com/get-npm)
- [Node.js](https://nodejs.org/) (version >= 14)

## Installation

1. **Clone the Repository**

```bash
git clone https://github.com/yourusername/keypom-trial-accounts.git
cd keypom-trial-accounts/contract
```

2. **Install Dependencies**

```bash
yarn install
```

3. **Build the Contract**

```bash
yarn build:release
```

This will compile the contract and generate a WASM file in the `out` directory.

## Contract Structure

The contract is organized into several modules for clarity and maintainability:

- **models**: Contains data structures and constants used across the contract.
- **trial_management**: Handles creating, deleting, and managing trials.
- **active_trial**: Manages actions performed by trial accounts, usage tracking, and exit mechanisms.
- **near**: Contains utilities and types specific to NEAR transactions and keys.
- **transaction_builder**: Provides a generic transaction builder pattern for constructing transactions.

## Usage

### Initializing the Contract

Deploy the contract to a NEAR account and initialize it:

```bash
near deploy --wasmFile out/main.wasm --accountId your-account.testnet

near call your-account.testnet new '{"admin_account": "admin.testnet", "mpc_contract": "mpc.testnet"}' --accountId your-account.testnet
```

### Creating a Trial

To create a new trial with specific parameters:

```bash
near call your-account.testnet create_trial '{
  "allowed_methods": ["method1", "method2"],
  "allowed_contracts": ["contract1.testnet", "contract2.testnet"],
  "max_gas": null,
  "max_deposit": null,
  "usage_constraints": null,
  "interaction_limits": null,
  "exit_conditions": null,
  "expiration_time": null,
  "chain_id": 1313161554
}' --accountId creator.testnet --deposit 1
```

- **Parameters**:
  - `allowed_methods`: Methods the trial account can call.
  - `allowed_contracts`: Contracts the trial account can interact with.
  - `max_gas`: Optional maximum gas limit per transaction.
  - `max_deposit`: Optional maximum deposit allowed.
  - `usage_constraints`: Optional usage constraints (e.g., max contracts, methods).
  - `interaction_limits`: Optional interaction limits (e.g., interactions per day).
  - `exit_conditions`: Optional exit conditions for the trial.
  - `expiration_time`: Optional expiration timestamp for the trial.
  - `chain_id`: The chain ID for the NEAR network.

### Adding Trial Keys

Add public keys to the trial for access control:

```bash
near call your-account.testnet add_trial_keys '{
  "public_keys": ["ed25519:yourpublickeyhere"],
  "trial_id": 1
}' --accountId creator.testnet --deposit 0.1
```

### Performing Actions

Trial accounts can perform actions within the allowed constraints:

```bash
near call your-account.testnet perform_action '{
  "contract_id": "target-contract.testnet",
  "method_name": "method_to_call",
  "args": "e30=",  // Base64-encoded JSON: {}
  "gas": "100000000000000",
  "deposit": "0"
}' --accountId trial-account.testnet --signerKeyPath path/to/key.json
```

### Exiting a Trial

To exit a trial and upgrade to a full account:

`TODO`

### Deleting a Trial

Creators can delete unused trials to reclaim storage:

```bash
near call your-account.testnet delete_trial '{
  "trial_id": 1
}' --accountId creator.testnet
```

## Scripts

The `scripts` directory contains helpful scripts for interacting with the contract.

### create_trial.sh

Creates a new trial:

```bash
#!/bin/bash
near call your-account.testnet create_trial '{
  "allowed_methods": ["method1", "method2"],
  "allowed_contracts": ["contract1.testnet", "contract2.testnet"],
  "max_gas": null,
  "max_deposit": null,
  "usage_constraints": null,
  "interaction_limits": null,
  "exit_conditions": null,
  "expiration_time": null,
  "chain_id": 1313161554
}' --accountId creator.testnet --deposit 1
```

### add_trial_keys.sh

Adds public keys to a trial:

```bash
#!/bin/bash
near call your-account.testnet add_trial_keys '{
  "public_keys": ["ed25519:yourpublickeyhere"],
  "trial_id": 1
}' --accountId creator.testnet --deposit 0.1

```

### perform_action.sh

Performs an action as a trial account:

```bash
#!/bin/bash
near call your-account.testnet perform_action '{
  "contract_id": "target-contract.testnet",
  "method_name": "method_to_call",
  "args": "e30=",  // Base64-encoded JSON: {}
  "gas": "100000000000000",
  "deposit": "0"
}' --accountId trial-account.testnet --signerKeyPath path/to/key.json
```

### exit_trial.sh

Exits a trial and adds a full access key:

```bash
#!/bin/bash
near call your-account.testnet exit_trial '{
  "public_key": "ed25519:yournewpublickeyhere",
  "derivation_path": "m/44'/397'/0'"
}' --accountId trial-account.testnet --signerKeyPath path/to/key.json

```

### delete_trial.sh

Deletes a trial:

```bash
#!/bin/bash
near call your-account.testnet delete_trial '{
  "trial_id": 1
}' --accountId creator.testnet

```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Additional Notes

To ensure smooth testing and deployment, please consider the following:

- **Error Handling**: The contract uses `assert` statements to enforce constraints. Ensure that the inputs meet the requirements to avoid runtime panics.
- **Nonce Management**: In the `TransactionBuilder`, replace hardcoded nonce values with appropriate logic to fetch and increment nonces.
- **MPC Contract Integration**: The contract interacts with an MPC contract. Ensure that the MPC contract is deployed and accessible at the specified address.
