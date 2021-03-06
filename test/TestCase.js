const expectThrow = require('./helpers/expectThrow')
const createEnvironment = require('./helpers/create-environment')
const Case = artifacts.require('Case.sol')
const createCase = require('./helpers/create-case')
const generateBytes = require('./helpers/generate-bytes')
const caseStatus = require('./helpers/case-status')
const resetCaseManager = require('./helpers/reset-case-manager')

contract('Case', function (accounts) {
  let caseInstance
  let env

  let patient = accounts[0]
  let doctor = accounts[1]

  before(async () => {
    env = await createEnvironment(artifacts)

    await env.doctorManager.addOrReactivateDoctor(patient, 'Patient is a Doc', 'CA', 'AB', true)
    await env.doctorManager.addOrReactivateDoctor(doctor, 'Doogie', 'US', 'CO', true)
  })

  beforeEach(async () => {
    await resetCaseManager(artifacts, env)

    caseInstance = await Case.at(await createCase(env, patient, doctor))

    const diagnosingDoctor = await caseInstance.diagnosingDoctor.call()
    assert.equal(diagnosingDoctor, doctor)
    assert.equal((await env.caseStatusManager.openCaseCount.call(doctor)).toString(), '1')
  })

  describe('initialize()', () => {
    it('should not work twice', async () => {
      assert.equal(await caseInstance.patient.call(), accounts[0])
      assert.equal(await caseInstance.status.call(), caseStatus('Evaluating'))
      assert.equal(await caseInstance.diagnosingDoctor.call(), doctor)

      await expectThrow(async () => {
        await caseInstance.initialize(
          accounts[0],
          'alaksefj',
          'caseKeySalt',
          'caseHash',
          web3.toWei('10', 'ether')
        )
      })
    })
  })

})
