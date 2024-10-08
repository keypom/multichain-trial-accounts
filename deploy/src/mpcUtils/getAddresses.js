// import { Near, KeyPair, keyStores, connect, transactions, utils, Account } from "near-api-js";
// import path from "path";
// import { homedir } from "os";
// import { ethers } from "hardhat";
// import { encode } from "@ethersproject/rlp";
// import { BN } from "bn.js";
// import { Ethereum } from "./utils/ethereum.js";


const { Near, KeyPair, keyStores, connect, transactions, utils, Account } = require("near-api-js");
const path = require("path");
const homedir = require("os").homedir();
const ethers = require('ethers');
const encode = require("@ethersproject/rlp").encode;
const BN = require("bn.js");
const Ethereum = require("./ethereum").Ethereum;
require('dotenv').config(); 
const { getInfo } = require("../tests/mpc");

// MPC Constants
const MPC = "v1.signer-prod.testnet"
const PATH = "my-first-eth-key"
const CHAIN_ID = 84532 // 97 bsc testnet
const CHAIN_RPC = "https://base-sepolia.g.alchemy.com/v2/4xc1NYZZl13rL_yWxgTJdrdcJys8ug3Y"

// NEAR Constants
const ACCOUNT_ID = "minqi.testnet"
const network = "testnet"
const CREDENTIALS_DIR = ".near-credentials";
const CREDENTIALSPATH =  path.join(homedir, CREDENTIALS_DIR);

async function main(){
    const paths = {
        ownerPath: `${process.env.CONTRACT_ADDRESS}-owner`,
        creatorPath1: `${process.env.CONTRACT_ADDRESS}-creator1`,
        creatorPath2: `${process.env.CONTRACT_ADDRESS}-creator2`
    }
    for(let key in paths){
        let {publicKey, address} = await getInfo(ACCOUNT_ID, paths[key], CHAIN_RPC, CHAIN_ID);
        console.log(`~~~~~~~~~~ ${paths[key]} ~~~~~~~~~~`);
        console.log(`public key: ${publicKey.toString('hex')}`);
        console.log(`address: ${address}`);
    }
}

module.exports = { getInfo }

main()
