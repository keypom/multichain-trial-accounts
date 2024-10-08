# Keypom Multichain Trial Accounts

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Usage](#usage)
  - [1. Create Trials](#1-create-trials)
  - [2. Perform Actions](#2-perform-actions)
  - [3. Broadcast Transactions](#3-broadcast-transactions)
  - [4. Combined Workflow](#4-combined-workflow)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## Introduction

**Keypom Trial Accounts** provides a framework for deploying and managing trial accounts on the NEAR blockchain using Multi-Party Computation (MPC) for secure signature handling. This project facilitates the deployment of trial contracts, creation and management of trial accounts, execution of actions with MPC signatures, and broadcasting of transactions. By modularizing these processes, it allows for efficient testing and interaction without the need for constant redeployment.

## Features

- **Contract Deployment**: Easily deploy trial contracts with configurable parameters.
- **Trial Creation**: Create and manage multiple trials with specific constraints.
- **MPC Integration**: Utilize MPC for secure and decentralized signature generation.
- **Action Execution**: Perform actions on trial accounts with pre-defined constraints.
- **Transaction Broadcasting**: Sign and broadcast transactions seamlessly.
- **Modular Scripts**: Separate scripts for trial creation, action execution, broadcasting, and log comparison for streamlined workflows.

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js**: Version 14.x or higher
- **Yarn**: For package management
- **TypeScript**: For type-safe JavaScript
- **NEAR CLI**: For interacting with the NEAR blockchain
- **Rust**: Required for compiling NEAR smart contracts
- **Git**: For version control

## Installation

1. **Clone the Repository**

```bash
git clone https://github.com/keypom/multichain-trial-accounts.git
cd multichain-trial-accounts
```

2. **Install Dependencies**

```bash
yarn install
```

3. **Build the Smart Contract**

   Ensure you have Rust installed. Then, navigate to the contract directory and build the contract.

```bash
cd contract
./build.sh
cd ..
```

_Note: The `build.sh` script should compile the Rust smart contract into WebAssembly (`.wasm`) format._

## Configuration

Configuration is managed centrally via the `deploy/config.ts` file located in the root directory. This file contains all the necessary settings for connecting to the NEAR network, managing trial parameters, and defining actions.

### `config.ts`

```ts
import { UnencryptedFileSystemKeyStore } from "@near-js/keystores-node";
import { Config, TrialData, ActionToPerform } from "./src/index";

import fs from "fs";
import path from "path";
import os from "os";

const homedir = os.homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);

// User configuration
export const config: Config = {
  networkId: "testnet",
  signerAccountId: "your-account.testnet",
  keyStore: new UnencryptedFileSystemKeyStore(credentialsPath),
  mpcContractId: "v1.signer-prod.testnet",
  numberOfKeys: 1,
  dataDir: "./data",
};

export const trialData: TrialData = {
  allowedMethods: ["add_message"],
  allowedContracts: ["guestbook.near-examples.testnet"],
  initialDeposit: "10",
  chainId: 1313161555,
};

export const actionsToPerform: ActionToPerform[] = [
  {
    targetContractId: "guestbook.near-examples.testnet",
    methodName: "add_message",
    args: { text: "Hello from MPC!" },
    attachedDepositNear: "1",
    gas: "300000000000000",
  },
];
```

### Configuration Parameters

- **networkId**: The NEAR network to connect to (`testnet`, `mainnet`, etc.).
- **signerAccountId**: The NEAR account ID that will sign the transactions to deploy and create trials.
- **keyStore**: Key store instance for managing NEAR keys.
- **mpcContractId**: The account ID of the MPC contract.
- **numberOfKeys**: Number of trial keys to generate.
- **dataDir**: Directory to store trial data and signatures.
- **trialData**: Defines the constraints and parameters for trials.
- **actionsToPerform**: List of actions to execute on trial accounts.

_Ensure to replace `"your-account.testnet"` and other placeholders with your actual NEAR account details._

### Key Directories and Files

- **contract/**: Contains the Rust smart contract code and build scripts.
- **data/**: Stores trial data, signatures, and key files.
- **deploy/**: Houses deployment and management scripts written in TypeScript.

## Usage

The project is divided into several scripts, each responsible for a specific task. Below is a step-by-step guide on how to use each script effectively.

### 1. Create Trials

**Script:** `deploy/createTrial.ts`

**Purpose:** Deploys a trial contract, creates a trial, adds trial accounts, activates them, and writes the trial data to a file.

**Usage:**

```bash
yarn createTrial
```

**Process:**

1. **Initialize NEAR Connection**: Connects to the NEAR network using the provided configuration.
2. **Deploy Contract**: Deploys the trial contract to a new account.
3. **Create Trial**: Initializes a new trial with specified parameters.
4. **Add Trial Accounts**: Generates trial keys and adds them to the trial.
5. **Activate Trial Accounts**: Activates the generated trial accounts.
6. **Write Trial Data**: Saves trial information to `data/trialData.json`.

**Output:**

- `data/trialData.json`: Contains trial ID, contract ID, and trial keys.

### 2. Perform Actions

**Script:** `deploy/performActions.ts`

**Purpose:** Executes predefined actions on trial accounts and collects signatures, nonces, and block hashes.

**Usage:**

```bash
yarn requestSignature
```

**Process:**

1. **Initialize NEAR Connection**: Connects to the NEAR network.
2. **Read Trial Data**: Loads trial information from `data/trialData.json`.
3. **Execute Actions**: Performs actions on each trial account and collects necessary data.
4. **Write Signatures**: Saves signatures, nonces, and block hashes to `data/signatures.json`.

**Output:**

- `data/signatures.json`: Contains signatures, nonces, and block hashes for each trial account.

### 3. Broadcast Transactions

**Script:** `deploy/broadcastFromSignature.ts`

**Purpose:** Reads signatures from `data/signatures.json` and broadcasts transactions to the NEAR network.

**Usage:**

```bash
yarn broadcastSignature
```

**Process:**

1. **Initialize NEAR Connection**: Connects to the NEAR network.
2. **Read Signatures**: Loads signatures from `data/signatures.json`.
3. **Read Trial Keys**: Loads trial keys from `data/trialData.json`.
4. **Broadcast Transactions**: Signs and sends transactions for each action using the collected signatures.

**Output:**

- Transactions are sent to the NEAR network. Transaction results are logged in the console.

### 4. Combined Workflow

**Purpose:** Executes the entire workflow from performing actions to broadcasting transactions and comparing logs.

**Usage:**

```bash
yarn createTrial && yarn requestSignature && yarn broadcastSignature
```

**Process:**

1. **Create Trial**: Runs `createTrial.ts`.
2. **Request Signature**: Runs `performActions.ts`.
3. **Broadcast Transactions**: Runs `broadcastFromSignature.ts`.

## Scripts

The project leverages several npm scripts defined in `package.json` to streamline operations.

### Available Scripts

| Script                | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `build`               | Compiles the smart contract using the build script.         |
| `createTrial`         | Deploys the trial contract and sets up trial accounts.      |
| `requestSignature`    | Executes actions on trial accounts and collects signatures. |
| `broadcastSignature`  | Broadcasts collected signatures as transactions.            |
| `requestAndBroadcast` | Performs actions and immediately broadcasts them.           |

## Contributing

Contributions are welcome! Whether you're reporting bugs, suggesting features, or submitting pull requests, your input is valuable.

## License

This project is licensed under the [MIT License](LICENSE).

---
