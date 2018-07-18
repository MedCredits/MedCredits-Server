import React, { Component } from 'react'
import { all } from 'redux-saga/effects'
import CaseDetails from '~/components/CaseDetails'
import { SubmitDiagnosisContainer } from './SubmitDiagnosis'
import ChallengedDiagnosis from '~/components/ChallengedDiagnosis'
import Diagnosis from '~/components/Diagnosis'
import { currentAccount } from '~/services/sign-in'
import { isBlank } from '~/utils/isBlank'
import { decryptDoctorCaseKey } from '~/services/decryptDoctorCaseKey'
import get from 'lodash.get'
import { withContractRegistry, withSaga, cacheCallValue } from '~/saga-genesis'
import { cacheCall, addContract } from '~/saga-genesis/sagas'
import { getFileHashFromBytes } from '~/utils/get-file-hash-from-bytes'
import { connect } from 'react-redux'
import { contractByName } from '~/saga-genesis/state-finders'
import { PageTitle } from '~/components/PageTitle'

function mapStateToProps(state, { match }) {
  let address = get(state, 'sagaGenesis.accounts[0]')
  const caseAddress = match.params.caseAddress
  const AccountManager = contractByName(state, 'AccountManager')
  const patientAddress = cacheCallValue(state, caseAddress, 'patient')
  const patientPublicKey = cacheCallValue(state, AccountManager, 'publicKeys', patientAddress)
  const encryptedCaseKey = cacheCallValue(state, caseAddress, 'doctorEncryptedCaseKeys', address)
  const diagnosingDoctor = cacheCallValue(state, caseAddress, 'diagnosingDoctor')
  const challengingDoctor = cacheCallValue(state, caseAddress, 'challengingDoctor')
  const diagnosisHash = getFileHashFromBytes(cacheCallValue(state, caseAddress, 'diagnosisHash'))
  const challengeHash = getFileHashFromBytes(cacheCallValue(state, caseAddress, 'challengeHash'))

  return {
    address,
    caseAddress,
    showDiagnosis: !!address,
    diagnosingDoctor,
    diagnosisHash,
    challengingDoctor,
    challengeHash,
    AccountManager,
    patientPublicKey,
    encryptedCaseKey
  }
}

function* saga({ match, address, AccountManager }) {
  if (!AccountManager) { return }
  const caseAddress = match.params.caseAddress
  yield addContract({ address: caseAddress, contractKey: 'Case'})
  const patientAddress = yield cacheCall(caseAddress, 'patient')
  yield all([
    cacheCall(AccountManager, 'publicKeys', patientAddress),
    cacheCall(caseAddress, 'doctorEncryptedCaseKeys', address),
    cacheCall(caseAddress, 'diagnosingDoctor'),
    cacheCall(caseAddress, 'diagnosisHash'),
    cacheCall(caseAddress, 'challengingDoctor'),
    cacheCall(caseAddress, 'challengeHash')
  ])
}

export const DiagnoseCaseContainer = withContractRegistry(connect(mapStateToProps)(withSaga(saga, { propTriggers: ['match', 'address', 'AccountManager']})(class _DiagnoseCase extends Component {
  render () {
    var challenging = this.props.challengingDoctor === this.props.address
    const caseKey = decryptDoctorCaseKey(currentAccount(), this.props.patientPublicKey, this.props.encryptedCaseKey)

    if (!isBlank(this.props.challengeHash)) {
      var challenge =
        <div className='col-xs-12'>
          <ChallengedDiagnosis
            caseAddress={this.props.match.params.caseAddress}
            caseKey={caseKey}
            title='Diagnosis'
            challengingDoctorAddress={this.props.challengingDoctor} />
        </div>
    } else if (this.props.challengingDoctor === this.props.address && !this.props.challengeHash) {
      challenge =
        <div className='col-xs-12'>
          <SubmitDiagnosisContainer
            caseAddress={this.props.caseAddress}
            caseKey={caseKey}
            diagnosisHash={this.props.diagnosisHash} />
        </div>
    }

    if (!isBlank(this.props.diagnosisHash) && !challenging) {
      var diagnosis =
        <div className='col-xs-12'>
          <Diagnosis
            caseAddress={this.props.caseAddress}
            caseKey={caseKey} />
        </div>
    } else if (this.props.diagnosingDoctor === this.props.address && !this.props.diagnosisHash) {
      diagnosis =
        <div className='col-xs-12'>
          <SubmitDiagnosisContainer
            caseAddress={this.props.caseAddress}
            caseKey={caseKey} />
        </div>
    }

    if (caseKey === undefined) {
      diagnosis = null
      challenge = null
    } else if (caseKey === null) {
      diagnosis = (
        <div className="col-xs-12 col-md-6 col-md-offset-3">
          <h4 className="text-danger">
            Cannot submit diagnosis
          </h4>
          <hr />
        </div>
      )
      challenge = null
    }

    return (
      <div>
        <PageTitle renderTitle={(t) => t('pageTitles.diagnoseCase', { caseId: ('' + this.props.caseAddress).substring(0, 6) } )} />
        <div className='container'>
          <div className='row'>
            <div id="view-case-details" className='col-xs-12'>
              <CaseDetails
                caseAddress={this.props.match.params.caseAddress}
                caseKey={caseKey}
                isDoctor={true} />
            </div>
            {diagnosis}
            {challenge}
          </div>
        </div>
      </div>
    )
  }
})))
