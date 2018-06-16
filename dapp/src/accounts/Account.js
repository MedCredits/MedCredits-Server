import decryptSecretKey from './decrypt-secret-key'
import aes from '~/services/aes'
import { deriveKeyPair } from './derive-key-pair'
import { deriveSharedKey } from './derive-shared-key'
import { buildAccount } from './build-account'
import { getAccount } from './get-account'
import { setAccount } from './set-account'
import { isAccountMasterPassword } from './is-account-master-password'
import { secretKeyToHex } from '~/utils/secret-key-to-hex'

export class Account {
  constructor (json) {
    this._json = json
  }

  encrypt (string) {
    return aes.encrypt(string, this.hexSecretKey())
  }

  decrypt (string) {
    return aes.decrypt(string, this.hexSecretKey())
  }

  deriveSharedKey (publicKey) {
    return deriveSharedKey(this.hexSecretKey(), publicKey)
  }

  unlock (masterPassword) {
    this._secretKey = decryptSecretKey(this._json, masterPassword)
  }

  isMasterPassword (masterPassword) {
    return isAccountMasterPassword(this._json, masterPassword)
  }

  unlocked () {
    return !!this._secretKey
  }

  requireUnlocked () {
    if (!this.unlocked()) {
      throw new Error('The account is locked')
    }
  }

  secretKey () {
    this.requireUnlocked()
    return this._secretKey
  }

  hexSecretKey () {
    return secretKeyToHex(this.secretKey())
  }

  hexPublicKey () {
    const hexPublicKey = this.deriveKeyPair().getPublic(true, 'hex')
    return hexPublicKey
  }

  deriveKeyPair () {
    return deriveKeyPair(this.hexSecretKey())
  }

  store () {
    setAccount(this.address(), this.toJson())
  }

  address() {
    return this._json.address
  }

  toJson() {
    return this._json
  }

  setVersion(version) {
    this._json.version = version
  }

  getVersion() {
    return this._json.version
  }
}

Account.create = function ({address, secretKey, masterPassword}) {
  const json = buildAccount(address, secretKey, masterPassword)
  const account = new Account(json)
  account.unlock(masterPassword)
  account.store()
  return account
}

Account.get = function (address) {
  const json = getAccount(address)
  return new Account(json)
}
