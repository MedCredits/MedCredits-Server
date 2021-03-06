import React, { Component } from 'react'
import { all } from 'redux-saga/effects'
import { CaseDetails } from '~/components/CaseDetails'
import { SubmitDiagnosisContainer } from './SubmitDiagnosis'
import ChallengedDiagnosis from '~/components/ChallengedDiagnosis'
import Diagnosis from '~/components/Diagnosis'
import { ScrollToTop } from '~/components/ScrollToTop'
import { currentAccount } from '~/services/sign-in'
import { isBlank } from '~/utils/isBlank'
import { isEmptyObject } from '~/utils/isEmptyObject'
import { decryptDoctorCaseKey } from '~/services/decryptDoctorCaseKey'
import get from 'lodash.get'
import {
  cacheCall,
  addContract,
  withSaga,
  LogListener,
  cacheCallValue,
  contractByName
} from '~/saga-genesis'
import {
  caseFinders,
  caseManagerFinders
} from '~/finders'
import { getFileHashFromBytes } from '~/utils/get-file-hash-from-bytes'
import { transactionFinders } from '~/finders/transactionFinders'
import { connect } from 'react-redux'
import { PageTitle } from '~/components/PageTitle'
import { fixAddress } from '~/utils/fixAddress'

function mapStateToProps(state, { match }) {
  if (isEmptyObject(match.params)) { return {} }

  let address = get(state, 'sagaGenesis.accounts[0]')
  const caseAddress = fixAddress(match.params.caseAddress)
  const submitDiagnosisTransaction = transactionFinders.diagnoseCase(state, caseAddress)
  const submitChallengeTransaction = transactionFinders.diagnoseChallengedCase(state, caseAddress)
  const AccountManager = contractByName(state, 'AccountManager')
  const patientAddress = cacheCallValue(state, caseAddress, 'patient')
  const patientPublicKey = cacheCallValue(state, AccountManager, 'publicKeys', patientAddress)
  const encryptedCaseKey = caseFinders.doctorEncryptedCaseKey(state, caseAddress, address)
  const diagnosingDoctor = cacheCallValue(state, caseAddress, 'diagnosingDoctor')
  const challengingDoctor = cacheCallValue(state, caseAddress, 'challengingDoctor')
  const diagnosisHash = getFileHashFromBytes(caseFinders.diagnosisHash(state, caseAddress))
  const challengeHash = getFileHashFromBytes(caseFinders.challengeHash(state, caseAddress))
  const fromBlock = caseManagerFinders.caseFromBlock(state, caseAddress)

  return {
    address,
    fromBlock,
    caseAddress,
    showDiagnosis: !!address,
    diagnosingDoctor,
    diagnosisHash,
    challengingDoctor,
    challengeHash,
    AccountManager,
    patientPublicKey,
    encryptedCaseKey,
    submitDiagnosisTransaction,
    submitChallengeTransaction
  }
}

function* saga({ match, address, AccountManager, fromBlock }) {
  if (!AccountManager || isEmptyObject(match.params)) { return }
  const caseAddress = fixAddress(match.params.caseAddress)
  yield addContract({ address: caseAddress, contractKey: 'Case'})
  const patientAddress = yield cacheCall(caseAddress, 'patient')
  yield all([
    cacheCall(AccountManager, 'publicKeys', patientAddress),
    cacheCall(caseAddress, 'status'),
    cacheCall(caseAddress, 'diagnosingDoctor'),
    cacheCall(caseAddress, 'challengingDoctor')
  ])
}

export const DiagnoseCaseContainer = connect(mapStateToProps)(withSaga(saga)(class _DiagnoseCase extends Component {
  render () {
    if (isEmptyObject(this.props.match.params)) { return null }

    const {
      challengingDoctor,
      address,
      diagnosisHash,
      challengeHash,
      diagnosingDoctor,
      caseAddress,
      submitDiagnosisTransaction,
      submitChallengeTransaction
    } = this.props
    const caseKey = decryptDoctorCaseKey(currentAccount(), this.props.patientPublicKey, this.props.encryptedCaseKey)

    const challengingDoc = (
      !isBlank(address)
      && !isBlank(challengingDoctor)
      && (challengingDoctor === address)
    )

    const diagnosingDoc = (
      !isBlank(address)
      && !isBlank(diagnosingDoctor)
      && (diagnosingDoctor === address)
    )

    var inProgress, diagnosis, challenge, submitDiagnosis, submitChallenge

    const diagnosisSubmitted =
      (submitDiagnosisTransaction && !submitDiagnosisTransaction.complete) ||
      (submitChallengeTransaction && !submitChallengeTransaction.complete)

    if (diagnosisSubmitted) {
      inProgress =
        <div className='col-xs-12'>
          <div className='alert alert-info'>
            Your diagnosis has been submitted. Please wait.
          </div>
        </div>
    } else if (diagnosingDoc) {
      if (isBlank(diagnosisHash)) {
        submitDiagnosis =
          <div className='col-xs-12'>
            <SubmitDiagnosisContainer
              caseAddress={caseAddress}
              caseKey={caseKey} />
          </div>
      } else {
        diagnosis =
          <div className='col-xs-12'>
            <Diagnosis
              title='Your Diagnosis'
              caseAddress={caseAddress}
              caseKey={caseKey}
            />
          </div>
      }
    } else if (challengingDoc) {
      if (isBlank(challengeHash)) {
        submitChallenge =
          <div className='col-xs-12'>
            <SubmitDiagnosisContainer
              caseAddress={caseAddress}
              caseKey={caseKey}
              diagnosisHash={diagnosisHash} />
          </div>
      } else {
        challenge =
          <div className='col-xs-12'>
            <ChallengedDiagnosis
              caseAddress={caseAddress}
              caseKey={caseKey}
              title='Your Diagnosis'
              challengingDoctorAddress={challengingDoctor}
            />
          </div>
      }
    }

    if (caseKey === undefined) {
      diagnosis = null
      challenge = null
    } else if (caseKey === null) {
      diagnosis = (
        <div className="col-xs-12 col-md-6 col-md-offset-3">
          <div className="alert alert-warning">
            <h4>
              Cannot submit diagnosis
            </h4>
          </div>
          <hr />
        </div>
      )
      challenge = null
      submitDiagnosis = null
      submitChallenge = null
    }

    return (
      <div>
        <LogListener address={caseAddress} fromBlock={this.props.fromBlock} />
        <ScrollToTop />
        <PageTitle renderTitle={(t) => t('pageTitles.diagnoseCase', { caseId: ('' + caseAddress).substring(0, 10) + ' ...' } )} />
        <div className='container'>
          <div className='row'>
            {diagnosis}
            {challenge}
            {inProgress}
            <div id="view-case-details" className='col-xs-12'>
              <CaseDetails
                caseAddress={caseAddress}
                caseKey={caseKey}
                caseIsOpenForDoctor={!!(submitDiagnosis || submitChallenge)}
                isDoctor={true} />
            </div>
            {submitDiagnosis}
            {submitChallenge}
          </div>
        </div>
      </div>
    )
  }
}))
