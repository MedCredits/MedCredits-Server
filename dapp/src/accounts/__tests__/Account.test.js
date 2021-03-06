import { Account } from '../Account'

describe('Account', () => {

  let account
  let secretKey = '962c9ad617c687a18e6e0280d09c685b52671e8cde50c1a1e86601287c422ce4'

  beforeEach(async () => {
    account = await Account.create({
      networkId: 1234,
      address: '0xc1a9b3F3c2ce1cc8cF102e665a1Ea99627A20F6e',
      secretKey: secretKey,
      masterPassword: 'whatever'
    })
  })

  test('account.secretKeyWithSaltAsync()', async () => {
    // var now = new Date()
    let salt = '5f72cf960c9999b675668e1673ddfab22c82672a7bc72d376cbfee9d75bc41f2'
    let expectedKey = '36e3f658bec9ccc9379c691e548117deb6fa3bf02fac2af9ee96ad4d866630ae'
    let newKey = await account.secretKeyWithSaltAsync(salt)
    let newKeyString = Buffer.from(newKey).toString('hex')
    expect(newKeyString).toEqual(expectedKey)
    // console.log('secretKeyWithSaltAsync() time: ', (new Date() - now))
  })

  test('account.secretKey()', () => {
    account._secretKey = 'asdfASDF'
    expect(account.secretKey()).toEqual('asdfasdf')
  })
})
