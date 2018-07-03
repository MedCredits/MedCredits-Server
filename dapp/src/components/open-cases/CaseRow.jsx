import React, {
  Component
} from 'react'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'
import get from 'lodash.get'
import { formatRoute } from 'react-router-named-routes'
import * as routes from '~/config/routes'
import { withSaga, withContractRegistry, cacheCallValue } from '~/saga-genesis'
import { cacheCall } from '~/saga-genesis/sagas'
import { doctorCaseStatusToName, doctorCaseStatusToClass } from '~/utils/doctor-case-status-labels'
import { addContract } from '~/saga-genesis/sagas'

function mapStateToProps(state, { address }) {
  let account = get(state, 'sagaGenesis.accounts[0]')
  const status = cacheCallValue(state, address, 'status')
  const caseFee = cacheCallValue(state, address, 'caseFee')
  const diagnosingDoctor = cacheCallValue(state, address, 'diagnosingDoctor')
  const challengingDoctor = cacheCallValue(state, address, 'challengingDoctor')
  return {
    status,
    caseFee,
    diagnosingDoctor,
    challengingDoctor,
    account
  }
}

function* propSaga({address}) {
  yield addContract({address, contractKey: 'Case'})
  yield cacheCall(address, 'status')
  yield cacheCall(address, 'caseFee')
  yield cacheCall(address, 'diagnosingDoctor')
  yield cacheCall(address, 'challengingDoctor')
}

export const CaseRow = withContractRegistry(connect(mapStateToProps)(withSaga(propSaga, { propTriggers: ['address'] })(class _CaseRow extends Component {
  render () {
    const caseRoute = formatRoute(routes.DOCTORS_CASES_DIAGNOSE_CASE, { caseAddress: this.props.address })
    var status = parseInt(this.props.status || 0, 10)
    let isDiagnosingDoctor = this.props.diagnosingDoctor === this.props.account
    let isChalleningDoctor = this.props.challengingDoctor === this.props.account
    if (isDiagnosingDoctor || isChalleningDoctor) {
      var address = <Link to={caseRoute}>{this.props.address}</Link>
    } else {
      address = this.props.address
    }
    if (this.props.status) {
      status = doctorCaseStatusToName(isApprovedDiagnosingADoctor, parseInt(this.props.status, 10))
      var statusClass = doctorCaseStatusToClass(isApprovedDiagnosingADoctor, parseInt(this.props.status, 10))
    }
    return (
      <tr>
        <td className="eth-address text"><span>{address}</span></td>
        <td width="20%" className="td--status">
          <label className={`label label-${statusClass}`}>{status === 0 ? '' : status}</label>
        </td>
        <td width="5%"></td>
      </tr>
    )
  }
})))

CaseRow.defaultProps = {
  status: 0,
  date: null
}
