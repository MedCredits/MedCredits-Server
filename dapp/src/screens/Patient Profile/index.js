import React, { Component } from 'react';
import NewCase from './components/NewCase';
import AccountAddress from '../../components/AccountAddress';
import AccountBalance from '../../components/AccountBalance';
import PatinetCases from './components/PatientCases';


class PatientProfile extends Component {
  render() {
    return (
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-6">
            <NewCase />
          </div>
          <div className="col-lg-3 col-md-6">
            <AccountBalance />
          </div>
          <div className="col-lg-6 col-md-12">
            <AccountAddress />
          </div>
        </div>
        <div className="row">
          <div className="col-xs-12">
            <PatinetCases />
          </div>
        </div>
      </div>
    );
  }
}

export default PatientProfile;
