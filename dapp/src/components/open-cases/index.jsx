import React, { Component } from 'react'
import ReactTimeout from 'react-timeout'
import { connect } from 'react-redux'
import FlipMove from 'react-flip-move'
import PropTypes from 'prop-types'
import getWeb3 from '~/get-web3'
import { contractByName } from '~/saga-genesis/state-finders'
import { withSaga, withContractRegistry, withSend } from '~/saga-genesis'
import { DiagnoseCaseContainer } from '~/components/doctors/diagnose'
import { DoctorCaseListing } from '~/components/doctors/DoctorCaseListing'
import { PageTitle } from '~/components/PageTitle'
import { ScrollToTop } from '~/components/ScrollToTop'
import { populateCases, populateCasesSaga } from '~/services/populateCases'
import { defined } from '~/utils/defined'
import { isEmptyObject } from '~/utils/isEmptyObject'
import forOwn from 'lodash.forown'
import get from 'lodash.get'

const DIAGNOSE_TX_REG_EXP = new RegExp(/diagnoseCase|diagnoseChallengedCase/)

function mapStateToProps(state) {
  let cases = []
  const address = get(state, 'sagaGenesis.accounts[0]')
  const CaseManager = contractByName(state, 'CaseManager')
  const caseCount = get(state, 'userStats.caseCount')
  // const caseCount = cacheCallValue(state, CaseManager, 'doctorCasesCount', address)

  cases = populateCases(state, CaseManager, address, caseCount)

  forOwn(state.sagaGenesis.transactions, function(transaction, transactionId) {
    let isDiagnosis = false
    const { confirmed, error, call } = transaction
    if (call && call.method) {
      isDiagnosis = DIAGNOSE_TX_REG_EXP.test(call.method)
    }

    if (isDiagnosis && (!confirmed || defined(error))) {
      const caseIndex = cases.findIndex(c => c.caseAddress === transaction.address)

      // update the existing case row object in the cases array
      if (caseIndex >= 0) {
        cases[caseIndex] = {
          ...cases[caseIndex],
          ...transaction,
          status: -1, // 'pending' tx state, before it's confirmed on the blockchain
          transactionId
        }
      }
    }
  })

  return {
    address,
    caseCount,
    cases,
    CaseManager
  }
}

function* saga({ caseCount, address, CaseManager }) {
  if (!caseCount || !address || !CaseManager) { return }

  yield populateCasesSaga(CaseManager, address, caseCount)
}

export const OpenCasesContainer = ReactTimeout(withContractRegistry(connect(mapStateToProps)(
  withSend(withSaga(saga, { propTriggers: ['address', 'caseCount', 'CaseManager'] })(class _OpenCasesContainer extends Component {

  componentDidMount() {
    // Remove this when we figure out how to update the Challenged Doctor's cases list
    // automatically from the block listener!
    this.pollNewCaseID = this.props.setInterval(this.pollForNewCase, 2000)
  }

  componentWillUnmount () {
    clearInterval(this.pollNewCaseID)
  }

  // Remove this when we figure out how to update the Challenged Doctor's cases list
  // automatically from the block listener!
  pollForNewCase = async () => {
    const { contractRegistry, CaseManager, address, isDoctor, isSignedIn } = this.props

    if (!CaseManager || !address || !isDoctor || !isSignedIn) { return }

    const CaseManagerInstance = contractRegistry.get(CaseManager, 'CaseManager', getWeb3())
    const newCaseCount = await CaseManagerInstance.methods.doctorCasesCount(address).call().then(caseCount => {
      return caseCount
    })

    if (newCaseCount !== this.props.caseCount) {
      this.props.dispatchNewCaseCount(newCaseCount)
    }
  }

  render () {
    let doctorCaseListing, diagnoseCase, doScrollToTop
    const { match, cases } = this.props

    const diagnosisJustSubmitted = (
      this.previousCaseAddress
      && !match.params.caseAddress
    )
    if (diagnosisJustSubmitted) {
      doScrollToTop = true
    }
    this.previousCaseAddress = match.params.caseAddress

    if (isEmptyObject(match.params)) {
      doctorCaseListing = <DoctorCaseListing key="doctorCaseListing" cases={cases} />
    } else {
      diagnoseCase = <DiagnoseCaseContainer key="diagnoseCaseContainerKey" match={match} />
    }

    return (
      <div>
        <ScrollToTop scrollToTop={doScrollToTop} />

        <PageTitle renderTitle={(t) => t('pageTitles.diagnoseCases')} />
        <FlipMove
          enterAnimation="fade"
          leaveAnimation="fade"
        >
          {diagnoseCase}
          {doctorCaseListing}
        </FlipMove>
      </div>
    )
  }
})))))

OpenCasesContainer.propTypes = {
  cases: PropTypes.array.isRequired
}

OpenCasesContainer.defaultProps = {
  cases: []
}
