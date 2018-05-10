import { setAccount } from './set-account'
import { deriveKeyPair } from './derive-key-pair'
import { setPublicKey } from '@/utils/web3-util'

export async function createAccount(account, secretKey) {
  var publicKey = deriveKeyPair(secretKey).getPublic(true, 'hex')
  await setPublicKey(publicKey)
  setAccount(account)
  return account
}