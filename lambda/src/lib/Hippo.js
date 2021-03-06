const Eth = require('ethjs')
const abi = require('ethjs-abi')
const SignerProvider = require('ethjs-provider-signer')
const sign = require('ethjs-signer').sign
const privateToAccount = require('ethjs-account').privateToAccount

const adminSettingsArtifact = require("../../../build/contracts/AdminSettings.json")
const betaFaucetArtifact = require("../../../build/contracts/BetaFaucet.json")
const doctorManagerArtifact = require("../../../build/contracts/DoctorManager.json")
const accountManagerArtifact = require("../../../build/contracts/AccountManager.json")
const registryArtifact = require("../../../build/contracts/Registry.json")
const daiArtifact = require("../../../build/contracts/Dai.json")

function fail(msg) {
  throw new Error(msg)
}

export class Hippo {
  constructor (config = {}) {
    this.privateKey = config.privateKey || fail('You must configure a private key')
    if (this.privateKey.length !== 66)
      fail('privateKey is not the correct length (Could need leading "0x")')
    this._providerUrl = config.providerUrl || fail('You must pass a provider URL')
    this._networkId = config.networkId || fail('You must pass a network id')
    this._account = privateToAccount(this.privateKey)
    // this._eth = new Eth(new SignerProvider(this._providerUrl, {
    //   signTransaction: (rawTx, cb) => cb(null, sign(rawTx, this._account.privateKey)),
    //   accounts: (cb) => cb(null, [this._account.address]),
    // }))
    this._eth = new Eth(new Eth.HttpProvider(this._providerUrl))
  }

  ownerAddress() {
    return this._account.address
  }

  getRegistryContract () {
    const registryAddress = registryArtifact.networks[this._networkId].address
    const Registry = new this._eth.contract(registryArtifact.abi).at(registryAddress)
    return Registry
  }

  lookupContractAddress (contractName) {
    return this.getRegistryContract().lookup(Eth.keccak256(contractName))
  }

  lookupAccountManager () {
    return this.lookupContractAddress('AccountManager')
      .then((addresses) => {
        console.log('AccountManager located at ', addresses)
        return new this._eth.contract(accountManagerArtifact.abi, accountManagerArtifact.bytecode, {
          from: this.ownerAddress(),
          gas: 4000000,
          gasPrice: Eth.toWei(20, 'gwei').toString()
        }).at(addresses[0])
      })
      .catch(error => fail(error.message))
  }

  async sendTransaction (tx) {
    let nonce = tx.nonce
    if (!nonce) {
      nonce = await this._eth.getTransactionCount(this._account.address, 'pending')
      tx.nonce = nonce.toString()
    }

    for (let i = 0; i < 20; i++) {
      try {
        return await this._eth.sendRawTransaction(sign(tx, this._account.privateKey))
      } catch (error) {
        if (error.message.match(/known transaction|transaction underpriced/)) {
          tx.nonce++
          console.info(`retry: ${i+1}`)
        } else {
          console.error(error)
          throw error
        }
      }
    }
  }

  sendEther (ethAddress) {
    return this.lookupContractAddress('BetaFaucet').then((betaFaucetAddress) => {
      const method = betaFaucetArtifact.abi.find((obj) => obj.name === 'sendEther')
      var data = abi.encodeMethod(method, [ethAddress, Eth.toWei('1', 'ether')])
      const tx = {
        from: this.ownerAddress(),
        to: betaFaucetAddress[0],
        gas: 4000000,
        gasPrice: Eth.toWei(20, 'gwei').toString(),
        data
      }
      console.info('sendEther tx: ', tx)
      return this.sendTransaction(tx)
    }).catch(error => {
      console.info(error.message)
      fail(error.message)
    })
  }

  sendMedX (ethAddress) {
    return this.lookupContractAddress('BetaFaucet').then((betaFaucetAddress) => {
      const method = betaFaucetArtifact.abi.find((obj) => obj.name === 'sendMedX')
      var data = abi.encodeMethod(method, [ethAddress, Eth.toWei('500', 'ether')])
      const tx = {
        from: this.ownerAddress(),
        to: betaFaucetAddress[0],
        gas: 4000000,
        gasPrice: Eth.toWei(20, 'gwei').toString(),
        data
      }
      console.info('sendMedX tx: ', tx)
      return this.sendTransaction(tx)
    }).catch(error => {
      console.info(error.message)
      fail(error.message)
    })
  }

  mintDai (ethAddress) {
    return this.lookupContractAddress('Dai').then((daiAddress) => {
      const method = daiArtifact.abi.find((obj) => obj.name === 'mint')
      var data = abi.encodeMethod(method, [ethAddress, Eth.toWei('1000', 'ether')])
      const tx = {
        from: this.ownerAddress(),
        to: daiAddress[0],
        gas: 4000000,
        gasPrice: Eth.toWei(20, 'gwei').toString(),
        data
      }
      return this.sendTransaction(tx)
    }).catch(error => {
      console.info(error.message)
      fail(error.message)
    })
  }

  async addOrReactivateDoctor (ethAddress, name, country, region, isDermatologist, publicKey) {
    return this.lookupContractAddress('AdminSettings').then(async (adminSettingsAddress) => {
      const AdminSettings = new this._eth.contract(
        adminSettingsArtifact.abi, adminSettingsArtifact.bytecode)
        .at(adminSettingsAddress[0])

      return AdminSettings.betaFaucetRegisterDoctor().then(async (result) => {
        const canSelfRegisterAsDoctor = result[0]
        if (!canSelfRegisterAsDoctor) {
          console.warn('Admin Settings prevent self registering as Doctor')
          return false
        }

        const accountManager = await this.lookupAccountManager()
        const existingPublicKeys = await accountManager.publicKeys(ethAddress)
        const existingPublicKey = existingPublicKeys['0']
        if (!existingPublicKey || existingPublicKey === '0x') {
          const method = accountManagerArtifact.abi.find((obj) => obj.name === 'setPublicKey')
          var data = abi.encodeMethod(method, [ethAddress, publicKey])
          const tx = {
            from: this.ownerAddress(),
            to: accountManager.address,
            gas: 4000000,
            gasPrice: Eth.toWei(20, 'gwei').toString(),
            data
          }
          return this.sendTransaction(tx)
            .then(() => {
              return this._addOrReactivateDoctor(ethAddress, name, country, region, isDermatologist)
            })
            .catch((error) => {
              console.error('addOrReactivateDoctor: ', error.message)
              fail(error.message)
            })
        } else {
          return this._addOrReactivateDoctor(ethAddress, name, country, region, isDermatologist)
        }
      })
    })
  }

  _addOrReactivateDoctor (ethAddress, name, country, region, isDermatologist) {
    return this.lookupContractAddress('DoctorManager')
      .then((doctorManagerAddress) => {
        const method = doctorManagerArtifact.abi.find((obj) => obj.name === 'addOrReactivateDoctor')
        var data = abi.encodeMethod(method, [ethAddress, name, country, region, isDermatologist])
        const tx = {
          from: this.ownerAddress(),
          to: doctorManagerAddress[0],
          gas: 4000000,
          gasPrice: Eth.toWei(20, 'gwei').toString(),
          data
        }
        return this.sendTransaction(tx)
      })
      .catch((error) => {
        console.info('errorr !! ', error.message)
        fail(error)
      })
  }
}
