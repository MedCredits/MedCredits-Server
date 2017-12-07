import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { withRouter } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { getCaseStatus, getCaseDoctorADiagnosisLocationHash, diagnoseCase, diagnoseChallengedCase } from '../../../utils/web3-util';
import { uploadJson, downloadJson } from '../../../utils/storage-util';


class SubmitDiagnosis extends Component {
    constructor(){
        super()

        this.state = {
            isChallenge: false,
            originalDiagnosis: null,
            
            diagnosis: null,
            recommendation: null,
            
            submitInProgress: false,
            showConfirmationModal: false,
            showThankYouModal: false
        };
    }

    async componentDidMount() {
        const status = await getCaseStatus(this.props.caseAddress);

        if(status.code === 4) {
        
            const diagnosisHash = await getCaseDoctorADiagnosisLocationHash(this.props.caseAddress);

            const diagnosisJson = await downloadJson(diagnosisHash);
            const diagnosis = JSON.parse(diagnosisJson);
            
            this.setState({
                isChallenge: true,
                originalDiagnosis: diagnosis.diagnosis
            });
        }
    }

    updateDiagnosis = (event) => {
        this.setState({diagnosis: event.target.value});
    }

    updateRecommendation = (event) => {
        this.setState({recommendation: event.target.value});
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        
        this.setState({showConfirmationModal: true});
    }

    handleCloseThankYouModal = (event) => {
        event.preventDefault();
        
        this.setState({showThankYouModal: false});

        this.props.history.push('/physician-profile');
    }

    handleCancelConfirmSubmissionModal = (event) => {
        this.setState({showConfirmationModal: false});
    }

    handleAcceptConfirmSubmissionModal = async (event) => {
        this.setState({showConfirmationModal: false});
        await this.submitDiagnosis();
    }

    submitDiagnosis = async () => {
        this.setState({submitInProgress: true});

        const diagnosisInformation = {
            diagnosis: this.state.diagnosis,
            recommendation: this.state.recommendation
        };

        const diagnosisJson = JSON.stringify(diagnosisInformation);

        const hash = await uploadJson(diagnosisJson);

        if(this.state.isChallenge) {
            const accept = this.state.originalDiagnosis === this.state.diagnosis;

            diagnoseChallengedCase(this.props.caseAddress, hash, accept, (error, result) => {
                if(error !== null) {
                    this.onError(error);
                } else {
                    this.onSuccess();
                }
            });
        } else {
            diagnoseCase(this.props.caseAddress, hash, (error, result) => {
                if(error !== null) {
                    this.onError(error);
                } else {
                    this.onSuccess();
                }
            });
        }
    }

    onError = (error) => {
        this.setState({
            error: error,
            submitInProgress: false
        });
        
    }

    onSuccess = () => {
        this.setState({submitInProgress: false});
        this.setState({showThankYouModal: true});
    }

    render() {
        return (
            <div className="card">
                <form method="#" action="#">
                    <div className="card-header">
                        <h2 className="card-title">
                            Your Diagnosis
                        </h2>
                        <p className="category">Fill out all of the fields and submit the form</p>
                    </div>
                    <div className="card-content">
                        <div className="form-group">
                            <label>Diagnosis</label>
                            <select onChange={this.updateDiagnosis} className="form-control">
                                <option value=""></option>
                                <option value="Abscess">Abscess</option>
                                <option value="Acne">Acne</option>
                                <option value="Alergic Contact Dermatitis">Alergic Contact Dermatitis</option>
                                <option value="Alopecia">Alopecia</option>
                                <option value="Bedsores">Bedsores</option>
                                <option value="Birthmark">Birthmark</option>
                                <option value="Bite">Bite</option>
                                <option value="Bruises">Bruises</option>
                                <option value="Burns">Burns</option>
                                <option value="Callus">Callus</option>
                                <option value="Cellulitis">Cellulitis</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Recommendation</label>
                            <textarea onChange={this.updateRecommendation} className="form-control" rows="5" required />
                        </div>
                        <button onClick={this.handleSubmit} type="submit" className="btn btn-fill btn-primary">Submit</button>
                    </div>
                </form>
                <Modal show={this.state.showConfirmationModal}>
                    <Modal.Body>
                        <div className="row">
                            <div className="col text-center">
                                <h4>Are you sure?</h4>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button onClick={this.handleAcceptConfirmSubmissionModal} type="button" className="btn btn-defult">Yes</button>
                        <button onClick={this.handleCancelConfirmSubmissionModal} type="button" className="btn btn-defult">No</button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.showThankYouModal}>
                    <Modal.Body>
                        <div className="row">
                            <div className="col text-center">
                                <h4>Thank you! Your diagnosis submitted successfully.</h4>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button onClick={this.handleCloseThankYouModal} type="button" className="btn btn-defult">OK</button>
                    </Modal.Footer>
                </Modal>
                <Spinner loading={this.state.submitInProgress}/>
            </div>
        );
    }
}

SubmitDiagnosis.propTypes = {
    caseAddress: PropTypes.string
};

SubmitDiagnosis.defaultProps = {
    caseAddress: null
};

export default withRouter(SubmitDiagnosis);
