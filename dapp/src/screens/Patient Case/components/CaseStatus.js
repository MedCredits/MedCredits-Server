import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getCaseStatus } from '../../../utils/web3-util';

class CaseStatus extends Component {
    constructor(){
        super()

        this.state = {
            status: {}
        };
    }

    async componentDidMount() {
        const status = await getCaseStatus(this.props.caseAddress);

        this.setState({status: status});
    }

    render() {
      var status = this.state.status.code
        return (
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Status</h2>
                </div>
                <div className="card-content">
                    {
                        status ===  1 ?
                        <div className="alert alert-info">
                            Your case is waiting to be assigned to a doctor.
                        </div>
                        : status === 2 ?
                        <div className="alert alert-info">
                            A doctor has requested to diagnose your case.  Please authorize the diagnosis.
                        </div>
                        : status === 3 ?
                        <div className="alert alert-success">
                            A doctor is currently diagnosing your case.
                        </div>
                        : status === 4 ?
                        <div className="alert alert-success">
                            Your case has been evaluated.  Please review it.
                        </div>
                        : status === 5 ?
                        <div className="alert alert-warning">
                            Your case has been successfully diagnosed and closed.
                        </div>
                        : status === 6 ?
                        <div className="alert alert-danger">
                            You challenged the case. The case has been submitted for review by another doctor.
                        </div>
                        : status === 7 ?
                        <div className="alert alert-success">
                            A doctor has requested to challenge the existing diagnoses.  Please authorize the challenge diagnosis.
                        </div>
                        : status === 8 ?
                        <div className="alert alert-danger">
                            Your case is under review by a second doctor.
                        </div>
                        : status === 9 ?
                        <div className="alert alert-danger">
                            You have cancelled this case.
                        </div>
                        : status === 10 ?
                        <div className="alert alert-danger">
                            You have received two different diagnoses from separate doctors. Please review both diagnoses and recommendations below. You have been refunded 10 MEDX and may consider re-submitting your case to the network or visiting your local dermatologist.
                        </div>
                        : status === 11 ?
                        <div className="alert alert-danger">
                            You have received the same diagnosis from separate doctors. Please review both recommendations below. A total of 15 MEDX was charged for your first opinion and discounted second opinion.
                        </div>
                        : null
                    }
                </div>
            </div>
        );
    }
}

CaseStatus.propTypes = {
    caseAddress: PropTypes.string
};

CaseStatus.defaultProps = {
    caseAddress: null
};

export default CaseStatus;