import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import {
  getCaseContract,
  getCaseStatus,
  getAccountManagerContract
} from '@/utils/web3-util'
import { caseStatusToName } from '@/utils/case-status-to-name'
import get from 'lodash.get'
import dispatch from '@/dispatch'
import bytesToHex from '@/utils/bytes-to-hex'
import { signedInSecretKey } from '@/services/sign-in'
import { withSaga, cacheCallValue, withContractRegistry, withSend } from '@/saga-genesis'
import reencryptCaseKey from '@/services/reencrypt-case-key'

function mapStateToProps(state, { caseAddress, contractRegistry }) {
  const accountManager = contractRegistry.requireAddressByName('AccountManager')
  const diagnosingDoctorA = cacheCallValue(state, caseAddress, 'diagnosingDoctorA')
  const diagnosingDoctorB = cacheCallValue(state, caseAddress, 'diagnosingDoctorB')
  const encryptedCaseKey = bytesToHex(cacheCallValue(state, caseAddress, 'getEncryptedCaseKey'))
  return {
    status: cacheCallValue(state, caseAddress, 'status'),
    encryptedCaseKey,
    diagnosingDoctorA,
    diagnosingDoctorB,
    diagnosingDoctorAPublicKey: cacheCallValue(state, accountManager, 'publicKeys', diagnosingDoctorA),
    diagnosingDoctorBPublicKey: cacheCallValue(state, accountManager, 'publicKeys', diagnosingDoctorB)
  }
}

function* saga({ caseAddress }, { cacheCall, contractRegistry }) {
  if (!caseAddress) { return {} }

  if (!contractRegistry.hasAddress(caseAddress)) {
    contractRegistry.add(yield getCaseContract(caseAddress))
  }

  let accountManager = contractRegistry.requireAddressByName('AccountManager')

  yield cacheCall(caseAddress, 'getEncryptedCaseKey')
  let status = yield cacheCall(caseAddress, 'status')

  if (status === '3') {
    let diagnosingDoctorA = yield cacheCall(caseAddress, 'diagnosingDoctorA')
    yield cacheCall(accountManager, 'publicKeys', diagnosingDoctorA)
  } else if (status === '8') {
    let diagnosingDoctorB = yield cacheCall(caseAddress, 'diagnosingDoctorB')
    yield cacheCall(accountManager, 'publicKeys', diagnosingDoctorB)
  }
}

export const CaseRow = withContractRegistry(connect(mapStateToProps)(withSaga(saga, { propTriggers: ['caseAddress']})(withSend(class _CaseRow extends Component {
  onApprove = () => {
    const status = this.props.status
    const encryptedCaseKey = this.props.encryptedCaseKey
    const { send, caseAddress } = this.props
    if (status === '3') {
      let doctor = this.props.diagnosingDoctorA
      let doctorPublicKey = this.props.diagnosingDoctorAPublicKey.substring(2)
      const doctorEncryptedCaseKey = reencryptCaseKey({secretKey: signedInSecretKey(), encryptedCaseKey, doctorPublicKey})
      send(caseAddress, 'authorizeDiagnosisDoctor', doctor, '0x' + doctorEncryptedCaseKey)()
    } else if (status === '8') {
      let doctor = this.props.diagnosingDoctorB
      let doctorPublicKey = this.props.diagnosingDoctorBPublicKey.substring(2)
      const doctorEncryptedCaseKey = reencryptCaseKey({secretKey: signedInSecretKey(), encryptedCaseKey, doctorPublicKey})
      send(caseAddress, 'authorizeChallengeDoctor', doctor, '0x' + doctorEncryptedCaseKey)()
    }
  }

  render () {
    if (!this.props.status) { return <tr></tr> }

    const status = +(this.props.status || '0')
    if (status === 3 || status === 8) {
      var approvalButton = <button className='btn btn-primary' onClick={this.onApprove}>Approve</button>
    }

    return (
      <tr>
        <td className="text-center">{this.props.caseIndex}</td>
        <td><Link to={`/patient-case/${this.props.caseAddress}`}>{this.props.caseAddress}</Link></td>
        <td>{caseStatusToName(status)}</td>
        <td className="td-actions text-right">
          {approvalButton}
        </td>
      </tr>
    )
  }
}))))

CaseRow.propTypes = {
  caseAddress: PropTypes.string,
  caseIndex: PropTypes.any
}
