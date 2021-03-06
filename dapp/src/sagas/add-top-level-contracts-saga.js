import {
  addContract
 } from '~/saga-genesis/sagas'
import { all } from 'redux-saga/effects'
import medXTokenContractConfig from '#/MedXToken.json'
import registryConfig from '#/Registry.json'

function* addTruffleArtifactAddresses(config, name) {
  var networkIds = Object.keys(config.networks)
  yield all(networkIds.map(function* (networkId) {
    var networkConfig = config.networks[networkId]
    // console.log('called by add-top-level-contracts-saga.js')
    yield addContract({
      address: networkConfig.address,
      name,
      networkId,
      contractKey: name
    })
  }))
}

export default function* () {
  yield addTruffleArtifactAddresses(registryConfig, 'Registry')
  yield addTruffleArtifactAddresses(medXTokenContractConfig, 'MedXToken')
}
