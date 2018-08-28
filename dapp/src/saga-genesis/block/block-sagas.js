import {
  call,
  put,
  takeEvery,
  getContext,
  select,
  take,
  fork
} from 'redux-saga/effects'
import {
  eventChannel,
  END
} from 'redux-saga'
import {
  contractKeyByAddress
} from '../state-finders'
import PollingBlockTracker from 'eth-block-tracker'

function createBlockTrackerEmitter (web3) {
  return eventChannel(emit => {
    let isFirst = true

    const blockTracker = new PollingBlockTracker({provider: web3.currentProvider})

    blockTracker.on('latest', (block) => {
      // console.log('isFirst: ', isFirst)
      // if (block.transactions.length) {
        // console.log(block.transactions)
      // }
      if (isFirst) {
        isFirst = false
      } else {
        emit({type: 'BLOCK_LATEST', block})
      }
    })

    blockTracker.start().catch((error) => {
      console.error('Block Tracker Failed with error:')
      console.error(error)
      emit(END)
    })

    return () => {
      blockTracker.stop()
    }
  })
}

function* startBlockTracker () {
  const web3 = yield getContext('web3')
  const channel = createBlockTrackerEmitter(web3)
  while (true) {
    yield put(yield take(channel))
  }
}

function* addAddressIfExists(addressSet, address) {
  if (!address) { return false }
  address = address.toLowerCase()
  const contractKey = yield select(contractKeyByAddress, address)
  if (contractKey) {
    console.log('contractKey for address: ', contractKey, address)
    addressSet.add(address)
    return true
  }
  return false
}

function* collectTransactionAddresses(addressSet, transaction) {
  const web3 = yield getContext('web3')
  const to = yield call(addAddressIfExists, addressSet, transaction.to)
  const from = yield call(addAddressIfExists, addressSet, transaction.from)
  if (to || from) {
    const receipt = yield web3.eth.getTransactionReceipt(transaction.hash)
    yield* receipt.logs.map(function* (log) {
      yield call(addAddressIfExists, addressSet, log.address)
      if (log.topics) {
        yield* log.topics.map(function* (topic) {
          if (topic) {
            // topics are 32 bytes and will have leading 0's padded for typical Eth addresses, ignore them
            const actualAddress = '0x' + topic.substr(26)
            yield call(addAddressIfExists, addressSet, actualAddress)
          }
        })
      }
    })
  }
}

export function* collectAllTransactionAddresses(transactions) {
  const addressSet = new Set()
  yield* transactions.map(function* (transaction) {
    yield call(collectTransactionAddresses, addressSet, transaction)
  })
  return addressSet
}

export function* blockContractAddresses(block) {
  const addressSet = yield call(collectAllTransactionAddresses, block.transactions)
  return Array.from(addressSet)
}

export function* latestBlock({block}) {
  const addresses = yield blockContractAddresses(block)
  yield* addresses.map(function* (address) {
    yield fork(put, {type: 'CACHE_INVALIDATE_ADDRESS', address})
  })
}

export default function* () {
  yield takeEvery('BLOCK_LATEST', latestBlock)
  yield fork(startBlockTracker)
}
