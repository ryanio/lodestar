#!/bin/bash -x

scriptDir=$(dirname $0)
. $scriptDir/common-setup.sh

$EL_BINARY_DIR/ethereumjs --datadir $DATA_DIR --gethGenesis $DATA_DIR/genesis.json --saveReceipts --rpc --ws --rpcEngine --rpcEnginePort=8545 --loglevel=debug --rpcDebug