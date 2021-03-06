import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  withSaga,
  cacheCallValue,
  cacheCallValueInt,
  contractByName,
  cacheCall,
  addContract
} from '~/saga-genesis'
import { connect } from 'react-redux'
import { isBlank } from '~/utils/isBlank'
import { computeTotalFee } from '~/utils/computeTotalFee'
import { CaseFee } from '~/components/CaseFee'
import get from 'lodash.get'

function mapStateToProps(state, { caseAddress }) {
  const status = (cacheCallValueInt(state, caseAddress, 'status') || 0)
  const diagnosingDoctor = cacheCallValue(state, caseAddress, 'diagnosingDoctor')
  const challengingDoctor = cacheCallValue(state, caseAddress, 'challengingDoctor')
  const caseFeeWei = cacheCallValue(state, caseAddress, 'caseFee')

  const DoctorManager = contractByName(state, 'DoctorManager')
  const diagnosingDoctorName = cacheCallValue(state, DoctorManager, 'name', diagnosingDoctor)
  const challengingDoctorName = cacheCallValue(state, DoctorManager, 'name', challengingDoctor)

  const networkId = get(state, 'sagaGenesis.network.networkId')

  return {
    status,
    DoctorManager,
    caseFeeWei,
    diagnosingDoctor,
    diagnosingDoctorName,
    challengingDoctor,
    challengingDoctorName,
    networkId
  }
}

function* saga({ caseAddress, DoctorManager, networkId }) {
  if (!networkId || !caseAddress || !DoctorManager) { return }

  yield addContract({ address: caseAddress, contractKey: 'Case' })
  yield cacheCall(caseAddress, 'status')
  yield cacheCall(caseAddress, 'caseFee')
  let diagnosingDoctor = yield cacheCall(caseAddress, 'diagnosingDoctor')
  let challengingDoctor = yield cacheCall(caseAddress, 'challengingDoctor')
  yield cacheCall(DoctorManager, 'name', diagnosingDoctor)
  if (!isBlank(challengingDoctor)) {
    yield cacheCall(DoctorManager, 'name', challengingDoctor)
  }
}

const CaseStatus = connect(mapStateToProps)(
  withSaga(saga)(
    class _CaseStatus extends Component {

    render() {
      const status = this.props.status
      let alert
      switch (status) {
        case 1:
          alert =
            <div className="alert alert-info">
              Your case is waiting to be assigned to a doctor.
            </div>
          break
        case 2:
          alert =
            <div className="alert alert-info">
              {
                this.props.diagnosingDoctorName
                ? `${this.props.diagnosingDoctorName} is currently diagnosing your case.`
                : `Loading ...`
              }
            </div>
          break
        case 3:
          alert =
            <div className="alert alert-warning">
              {
                this.props.diagnosingDoctorName
                ? `Your case has been evaluated by ${this.props.diagnosingDoctorName}, please review it:`
                : `Loading ...`
              }
            </div>
          break
        case 4:
          alert =
            <div className="alert alert-success">
              This case is closed.
            </div>
          break
        case 5:
          alert =
            <div className="alert alert-info">
              {
                this.props.challengingDoctorName
                ? `Your case is under challenge review by ${this.props.challengingDoctorName}.`
                : `Loading ...`
              }
            </div>
          break
        case 6:
          alert =
            <div className="alert alert-success">
              You have received two different diagnoses from separate doctors. Please review both diagnoses and recommendations below. You have been refunded <CaseFee address={this.props.caseAddress} /> and may consider re-submitting your case to the network or visiting your local dermatologist.
            </div>
          break
        case 7:
          alert =
            <div className="alert alert-success">
              You have received the same diagnosis from separate doctors. Please review both recommendations below. A total of <CaseFee address={this.props.caseAddress} calc={computeTotalFee} /> was charged for your first opinion and discounted second opinion.
            </div>
          break
        default:
          alert = <div />
      }
      return alert
    }
}))

CaseStatus.propTypes = {
    caseAddress: PropTypes.string.isRequired
};

export default CaseStatus;
