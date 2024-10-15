#!/bin/bash
set -e

cargo build --target wasm32-unknown-unknown --release --features js
mkdir -p ../out
cp target/wasm32-unknown-unknown/release/*.wasm ../out/trials.wasm
