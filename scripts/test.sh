docker run --rm -it -d --name ganache-cli -p 8145:8545 trufflesuite/ganache-cli:latest -e 10000000000 -l 4700038 -h 0.0.0.0 && \
  truffle compile --network=test && \
  truffle migrate --network=test && \
  truffle test --network=test && \
  docker stop ganache-cli
