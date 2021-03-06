const promisify = require('../test/helpers/promisify').promisify
const deployAndRegister = require('./support/deployAndRegister')
const toRegistryKey = require('./support/toRegistryKey')
const Registry = artifacts.require('./Registry.sol')
const WETH9 = artifacts.require('./WETH9.sol')

module.exports = function(deployer) {
  // Use deployer to state migration tasks.
  deployer.then(async () => {
    const registryInstance = await Registry.deployed()
    const networkId = await promisify(cb => web3.version.getNetwork(cb))
    const key = 'WrappedEther'
    const registryKey = toRegistryKey(key)
    switch(networkId) {
      case '1': //mainnet
        return registryInstance.register(registryKey, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
      case '3': //ropsten
        return registryInstance.register(registryKey, '0xc778417e063141139fce010982780140aa0cd5ab')
      case '4': //rinkeby
        return registryInstance.register(registryKey, '0xc778417e063141139fce010982780140aa0cd5ab')
      case '42': //kovan
        return registryInstance.register(registryKey, '0xd0a1e359811322d97991e03f863a0c30c2cf029c')
      default: // localhost
        return deployAndRegister(deployer, WETH9, Registry, key)
    }
  })
};
