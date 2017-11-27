import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import graphicLogo from '../../../assets/img/graphiclogo.png';
import './Welcome.css';

class Welcome extends Component {
  navigateToPatientScreen(){
    this.props.history.push('/patient-profile');
  }

  navigateToDoctorScreen = () => {
    this.props.history.push('/doctor');
  }
  
  render() {
    return (
        <div className="card card-lock">
            <div className="card-content">
                <div className="row">
                    <div className="col-md-12">
                        <h4>
                            Select View
                        </h4>
                    </div>
                    <div className="col-md-12">
                        <button 
                            type="button" 
                            className="btn btn-default btn-info btn-lg btn-welcome"
                            onClick={() => this.navigateToPatientScreen()}>
                            Patient View
                        </button>
                    </div>
                    <div className="col-md-12 top5">
                        <button 
                            type="submit" 
                            className="btn btn-default btn-info btn-lg btn-welcome"
                            onClick={() => this.navigateToDoctorScreen()}>
                        Physician View
                        </button>
                    </div>
                </div>
            </div>
            <div className="card-footer">
            </div>
        </div>
    );
  }
}

export default withRouter(Welcome);