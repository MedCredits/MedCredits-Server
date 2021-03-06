import { createStore, applyMiddleware, compose } from 'redux'
import createSagaMiddleware from 'redux-saga'
import sagas from './sagas'
import reducers from './reducers'
import { ContractRegistry, CallCountRegistry } from '~/saga-genesis'
import contractRegistryOptions from './contract-registry-options'
import { preloadedState } from '~/services/preloadedStateService'
import { bugsnagClient } from '~/bugsnagClient'

const debug = require('debug')('actions')

export const writeContractRegistry = new ContractRegistry(contractRegistryOptions)
export const readContractRegistry = new ContractRegistry(contractRegistryOptions)
export const callCountRegistry = new CallCountRegistry()
export const logRegistry = new CallCountRegistry()

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const sagaMiddleware = createSagaMiddleware({
  context: {
    writeContractRegistry,
    readContractRegistry,
    callCountRegistry,
    logRegistry
  }
})

function logger({ getState }) {
  return next => action => {
    debug(action.type, action)
    return next(action)
  }
}

let store = createStore(
  reducers,
  preloadedState(),
  composeEnhancers(applyMiddleware(logger, sagaMiddleware))
)
sagaMiddleware.run(sagas)

store.subscribe(() => {
  bugsnagClient.metaData = bugsnagClient.metaData || {}
  bugsnagClient.metaData.state = store.getState()
})

export default store
