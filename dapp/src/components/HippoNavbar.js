import React, { Component } from 'react'
import classnames from 'classnames'
import {
  Nav,
  Navbar,
  NavItem,
  NavDropdown,
  MenuItem
} from 'react-bootstrap'
import {
  IndexLinkContainer,
  LinkContainer
} from 'react-router-bootstrap'
import { withRouter, Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import logo from '../assets/img/logo.png'
import get from 'lodash.get'
import networkIdToName from '~/utils/network-id-to-name'
import { connect } from 'react-redux'
import { cacheCall } from '~/saga-genesis/sagas'
import { withContractRegistry, withSaga } from '~/saga-genesis/components'
import { cacheCallValue, contractByName } from '~/saga-genesis/state-finders'

import { CurrentTransactionsList } from '~/components/CurrentTransactionsList'

function mapStateToProps (state) {
  const account = get(state, 'sagaGenesis.accounts[0]')
  const DoctorManager = contractByName(state, 'DoctorManager')
  const isDoctor = cacheCallValue(state, DoctorManager, 'isDoctor', account)
  const canRegister = cacheCallValue(state, DoctorManager, 'owner') === account
  const networkId = get(state, 'sagaGenesis.network.networkId')
  const signedIn = state.account.signedIn
  return {
    account,
    isDoctor,
    networkId,
    DoctorManager,
    signedIn,
    canRegister
  }
}

function mapDispatchToProps (dispatch) {
  return {
    signOut: () => {
      dispatch({ type: 'SIGN_OUT' })
    }
  }
}

function* saga({ account, DoctorManager }) {
  if (!account || !DoctorManager) { return }
  yield cacheCall(DoctorManager, 'owner')
  yield cacheCall(DoctorManager, 'isDoctor', account)
}

export const HippoNavbar = withContractRegistry(connect(mapStateToProps, mapDispatchToProps)(withSaga(saga, { propTriggers: ['account', 'DoctorManager', 'MedXToken'] })(class _HippoNavbar extends Component {
  signOut = () => {
    this.props.signOut()
    this.props.history.push('/sign-in')
  }

  render() {
    var isDoctor = this.props.isDoctor

    if (this.props.signedIn) {
      var profileMenu =
        <NavDropdown title='My Account' id='my-account'>
          <LinkContainer to='/wallet'>
            <MenuItem href='/wallet'>
              My Balance
            </MenuItem>
          </LinkContainer>
          <LinkContainer to='/emergency-kit'>
            <MenuItem href='/emergency-kit'>
              My Emergency Kit
            </MenuItem>
          </LinkContainer>
          <MenuItem divider />
          <MenuItem onClick={this.signOut}>
            Sign Out
          </MenuItem>
        </NavDropdown>

      var myCasesItem =
        <IndexLinkContainer to='/patients/cases'  activeClassName="active">
          <NavItem href='/patients/cases'>
            My Cases
          </NavItem>
        </IndexLinkContainer>

      if (isDoctor) {
        var openCasesItem =
          <LinkContainer to='/doctors/cases/open'>
            <NavItem href='/doctors/cases/open'>
              Diagnose Cases
            </NavItem>
          </LinkContainer>
      }

      if (this.props.canRegister) {
        var doctorsItem =
          <LinkContainer to='/doctors/new'>
            <NavItem href='/doctors/new'>
              Doctors
            </NavItem>
          </LinkContainer>
      }
    }

    let navbarClassName = classnames('navbar', { 'navbar-transparent': this.props.transparent, 'navbar-absolute': this.props.transparent, 'navbar-default': !this.props.transparent})

    let dynamicHomePath = this.props.signedIn ? '/patients/cases' : '/'

    return (
      <Navbar
        inverse
        collapseOnSelect
        id="mainNav"
        className={navbarClassName}>
        <Navbar.Header>
          <Navbar.Brand>
            <Link to={dynamicHomePath} className="navbar-brand">
              <img src={logo} alt="MedCredits"></img>
            </Link>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Nav className="nav--network-name">
          <NavItem>
            {networkIdToName(this.props.networkId)} Network
          </NavItem>
        </Nav>
        <Navbar.Collapse>
          <Nav pullRight>
            <CurrentTransactionsList />
            {myCasesItem}
            {openCasesItem}
            {doctorsItem}
            {profileMenu}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
})))

HippoNavbar.propTypes = {
  transparent: PropTypes.bool
};

HippoNavbar.defaultProps = {
  transparent: false,
  accounts: []
};

export const HippoNavbarContainer = withRouter(HippoNavbar)