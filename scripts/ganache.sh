#! /bin/sh
mkdir -p .ganache
ganache-cli --noVMErrorsOnRPCResponse --db .ganache -i 1234 -e 100000000000 -a 10 -u 0 -b 3 -m "$HDWALLET_MNEMONIC"
