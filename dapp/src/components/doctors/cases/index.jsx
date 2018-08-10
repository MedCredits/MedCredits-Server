import React, { Component } from 'react'
import { connect } from 'react-redux'
import FlipMove from 'react-flip-move'
import { DiagnoseCaseContainer } from '~/components/doctors/diagnose'
import { DoctorCaseListingContainer } from '~/components/doctors/cases/DoctorCaseListingContainer'
import { PageTitle } from '~/components/PageTitle'
import { ScrollToTop } from '~/components/ScrollToTop'
import { formatRoute } from 'react-router-named-routes'
import {
  cacheCallValue,
  contractByName,
  withSaga,
  cacheCall
} from '~/saga-genesis'
import { isBlank } from '~/utils/isBlank'
import range from 'lodash.range'
import get from 'lodash.get'
import * as routes from '~/config/routes'

const MAX_CASES_PER_PAGE = 5

function mapStateToProps(state, { match }) {
  let start = 0
  let end = 0
  let pageNumbers = []

  const address = get(state, 'sagaGenesis.accounts[0]')
  const CaseManager = contractByName(state, 'CaseManager')

  let openCaseCount = cacheCallValue(state, CaseManager, 'openCaseCount', address)
  const openCaseAddresses = []

  let currentNodeId = cacheCallValue(state, CaseManager, 'firstOpenCaseId', address)
  while (currentNodeId && currentNodeId !== '0') {
    const openCaseAddress = cacheCallValue(state, CaseManager, 'openCaseAddress', address, currentNodeId)
    if (openCaseAddress && !isBlank(openCaseAddress)) {
      openCaseAddresses.push(openCaseAddress)
    }
    console.log('currentNodeId (mSTP)', currentNodeId, openCaseAddress)
    currentNodeId = cacheCallValue(state, CaseManager, 'nextOpenCaseId', address, currentNodeId)
  }

  let closedCaseCount = cacheCallValue(state, CaseManager, 'closedCaseCount', address)
  if (closedCaseCount) {
    closedCaseCount = parseInt(closedCaseCount, 10)
  } else {
    closedCaseCount = 0
  }

  let { currentPage } = match.params
  if (!currentPage) {
    currentPage = 1
  }

  // const start = ((parseInt(currentPage, 10) - 1) * MAX_CASES_PER_PAGE)
  // const end = start + MAX_CASES_PER_PAGE
  let closedCaseAddresses = []
  if (closedCaseCount) {
    const totalPages = Math.ceil(closedCaseCount / MAX_CASES_PER_PAGE)
    pageNumbers = range(1, totalPages + 1)

    start = (closedCaseCount - ((parseInt(currentPage, 10) - 1) * MAX_CASES_PER_PAGE))
    end = Math.max((start - MAX_CASES_PER_PAGE), 0)

    console.log(totalPages, pageNumbers, start, end)

    for (let i = (start - 1); i >= end; i--) {
      const closedCaseAddress = cacheCallValue(state, CaseManager, 'closedCaseAtIndex', address, i)
      console.log(closedCaseAddress)

      if (closedCaseAddress && !isBlank(closedCaseAddress)) {
        closedCaseAddresses.push(closedCaseAddress)
      } else {
        break
      }
    }
  }

  return {
    address,
    CaseManager,
    closedCaseCount,
    openCaseCount,
    openCaseAddresses,
    closedCaseAddresses,
    pageNumbers,
    currentPage,
    start,
    end,
  }
}

function* saga({ address, CaseManager, start, end }) {
  if (!address || !CaseManager) { return }

  const cc = yield cacheCall(CaseManager, 'openCaseCount', address)
  console.log('cc', cc)

  yield cacheCall(CaseManager, 'closedCaseCount', address)

  let currentNodeId = yield cacheCall(CaseManager, 'firstOpenCaseId', address)
  while (currentNodeId && currentNodeId !== '0') {
    const add = yield cacheCall(CaseManager, 'openCaseAddress', address, currentNodeId)
    console.log('currentNodeId (saga): ', currentNodeId, add)
    currentNodeId = yield cacheCall(CaseManager, 'nextOpenCaseId', address, currentNodeId)
  }

  yield range((start - 1), end).map(function* (index) {
    yield cacheCall(CaseManager, 'closedCaseAtIndex', address, index)
  })
}

export const OpenCasesContainer = connect(mapStateToProps)(
  withSaga(saga, { propTriggers: ['address', 'openCaseCount', 'closedCaseCount', 'CaseManager', 'start', 'end'] })(
    class _OpenCasesContainer extends Component {

      componentDidMount() {
        this.redirectToFirstPage(this.props)
      }

      componentWillReceiveProps(nextProps) {
        this.redirectToFirstPage(nextProps)
      }

      redirectToFirstPage = (props) => {
        if (!props.match.params.caseAddress && !props.match.params.pageNumber) {
          const firstPageRoute = formatRoute(routes.DOCTORS_CASES_OPEN_PAGE_NUMBER, { pageNumber: 1 })
          props.history.push(firstPageRoute)
        }
      }

      render () {
        let doctorCaseListing, diagnoseCase, doScrollToTop
        const {
          closedCaseAddresses,
          openCaseCount,
          openCaseAddresses,
          closedCaseCount,
          match,
          currentPage,
          pageNumbers
        } = this.props

        if (match.params.caseAddress) {
          diagnoseCase = <DiagnoseCaseContainer key="diagnoseCaseContainerKey" match={match} />
        } else {
          doctorCaseListing = <DoctorCaseListingContainer
            key="doctorCaseListing"
            openCaseAddresses={openCaseAddresses}
            closedCaseAddresses={closedCaseAddresses}
            openCaseCount={openCaseCount}
            closedCaseCount={closedCaseCount}
            pageNumbers={pageNumbers}
            currentPage={currentPage}
          />
        }

        const diagnosisJustSubmitted = (
          this.previousCaseAddress
          && !match.params.caseAddress
        )
        if (diagnosisJustSubmitted) {
          doScrollToTop = true
        }
        this.previousCaseAddress = match.params.caseAddress

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
    }
  )
)

OpenCasesContainer.defaultProps = {
  openCaseAddresses: [],
  closedCaseAddresses: []
}
