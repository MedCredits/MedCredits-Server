import React, { Component } from 'react';
import { Modal } from 'react-bootstrap';
import { genKey } from '@/services/gen-key'
import { withRouter } from 'react-router-dom';
import Spinner from '../../../components/Spinner';
import { isNotEmptyString } from '../../../utils/common-util';
import { getSelectedAccountBalance, createCase } from '../../../utils/web3-util';
import { uploadJson, uploadFile } from '../../../utils/storage-util';
import { signedInSecretKey } from '@/services/sign-in'
import aes from '@/services/aes'

class CreateCase extends Component {
    constructor(){
        super()

        this.state = {
            firstImageHash: null,
            firstFileName: null,
            secondImageHash: null,
            secondFileName: null,
            howLong: null,
            size: null,
            skinCancer: null,
            sexuallyActive: null,
            age: null,
            country: null,
            description: null,
            caseEncryptionKey: genKey(32),


            canSubmit: false,
            submitInProgress: false,
            showBalanceTooLowModal: false,
            showConfirmSubmissionModal: false,
            showThankYouModal: false
        };
    }

    captureFirstImage = async (event) => {
        const fileName = event.target.files[0].name;
        const imageHash = await this.captureFile(event);
        this.setState({
            firstImageHash: imageHash,
            firstFileName: fileName
        }, this.validateInputs);
    }

    captureSecondImage = async (event) => {
        const fileName = event.target.files[0].name;
        const imageHash = await this.captureFile(event);
        this.setState({
            secondImageHash: imageHash,
            secondFileName: fileName
        }, this.validateInputs);
    }

    captureFile = async (event) => {
        this.setState({submitInProgress: true});

        event.stopPropagation()
        event.preventDefault()
        const file = event.target.files[0]
        const imageHash = await uploadFile(file, this.state.caseEncryptionKey);

        this.setState({submitInProgress: false});
        return imageHash;
    }

    updateHowLong = (event) => {
        this.setState({howLong: event.target.value}, this.validateInputs);
    }

    updateSize= (event) => {
        this.setState({size: event.target.value}, this.validateInputs);
    }

    updateSkinCancer= (event) => {
        this.setState({skinCancer: event.target.value}, this.validateInputs);
    }

    updateSexuallyActive= (event) => {
        this.setState({sexuallyActive: event.target.value}, this.validateInputs);
    }

    updateAge = (event) => {
        this.setState({age: event.target.value}, this.validateInputs);
    }

    updateCountry = (event) => {
        this.setState({country: event.target.value}, this.validateInputs);
    }

    updateDescription = (event) => {
        this.setState({description: event.target.value});
    }

    handleSubmit = (event) => {
      event.preventDefault()
      getSelectedAccountBalance().then((accountBalance) => {
        if(accountBalance < 15) {
            this.setState({showBalanceTooLowModal: true});
        } else {
            this.setState({showConfirmSubmissionModal: true});
        }
      })
    }

    validateInputs = () => {
        const valid =
            isNotEmptyString(this.state.firstImageHash) &&
            isNotEmptyString(this.state.secondImageHash) &&
            isNotEmptyString(this.state.howLong) &&
            isNotEmptyString(this.state.size) &&
            isNotEmptyString(this.state.skinCancer) &&
            isNotEmptyString(this.state.sexuallyActive) &&
            isNotEmptyString(this.state.age) &&
            isNotEmptyString(this.state.country);

            this.setState({ canSubmit: valid });
    }

    handleCloseBalanceTooLowModal = (event) => {
        event.preventDefault();

        this.setState({showBalanceTooLowModal: false});
    }

    handleCloseThankYouModal = (event) => {
        event.preventDefault();

        this.setState({showThankYouModal: false});

        this.props.history.push('/patient-profile');
    }

    handleCancelConfirmSubmissionModal = (event) => {
        event.preventDefault();
        this.setState({showConfirmSubmissionModal: false});
    }

    handleAcceptConfirmSubmissionModal = async (event) => {
        event.preventDefault();

        this.setState({showConfirmSubmissionModal: false});
        await this.createNewCase();
    }

    createNewCase = async () => {
        this.setState({submitInProgress: true});

        const caseInformation = {
            firstImageHash: this.state.firstImageHash,
            secondImageHash: this.state.secondImageHash,
            howLong: this.state.howLong,
            size: this.state.size,
            skinCancer: this.state.skinCancer,
            sexuallyActive: this.state.sexuallyActive,
            age: this.state.age,
            country: this.state.country,
            description: this.state.description
        };

        const caseJson = JSON.stringify(caseInformation);

        const hash = await uploadJson(caseJson, this.state.caseEncryptionKey);

        createCase(aes.encrypt(this.state.caseEncryptionKey, signedInSecretKey()), hash, (error, result) => {
            if(error !== null) {
                this.onError(error);
            } else {
                this.onSuccess();
            }
        });
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
                <form onSubmit={this.handleSubmit} >
                    <div className="card-header">
                        <h2 className="card-title">
                            Submit New Case
                        </h2>
                    </div>
                    <div className="card-content">
                        <div className="form-group">
                            <label>Overview Photo<span className='star'>*</span></label>
                            <div>
                                <label className="btn btn-primary">
                                    Browse...<input onChange={this.captureFirstImage} type="file" className="form-control" style={{display: 'none'}} required/>
                                </label>
                                <span>
                                    {this.state.firstFileName}
                                </span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Close-up Photo<span className='star'>*</span></label>
                            <div>
                                <label className="btn btn-primary">
                                    Browse...<input onChange={this.captureSecondImage} type="file" className="form-control" style={{display: 'none'}} required/>
                                </label>
                                <span>
                                    {this.state.secondFileName}
                                </span>
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="row">
                                <div className="col-lg-6 col-md-6 top15">
                                    <label>How long have you had this problem?<span className='star'>*</span></label>
                                    <div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateHowLong} name="lengthOfTime" id="days" type="radio" value="Days" required />
                                            <label htmlFor="days">
                                                Days
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateHowLong} name="lengthOfTime" id="weeks" type="radio" value="Weeks" required />
                                            <label htmlFor="weeks">
                                                Weeks
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateHowLong} name="lengthOfTime" id="months" type="radio" value="Months" required />
                                            <label htmlFor="months">
                                                Months
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateHowLong} name="lengthOfTime" id="years" type="radio" value="Years" required />
                                            <label htmlFor="years">
                                                Years
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-6 top15">
                                    <label>Is it growing, shrinking or staying the same size?<span className='star'>*</span></label>
                                    <div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSize} name="size" id="growing" type="radio" value="Growing" required />
                                            <label htmlFor="growing">
                                                Growing
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSize} name="size" id="shrinking" type="radio" value="Shrinking" required />
                                            <label htmlFor="shrinking">
                                                Shrinking
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSize} name="size" id="sameSize" type="radio" value="Same size" required />
                                            <label htmlFor="sameSize">
                                                Same size
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">

                            <div className="row">
                                <div className="col-lg-6 col-md-6 top15">
                                    <label>Any history of skin cancer?<span className='star'>*</span></label>
                                    <div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSkinCancer} name="skinCancer" id="yes" type="radio" value="Yes" required />
                                            <label htmlFor="yes">
                                                Yes
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSkinCancer} name="skinCancer" id="no" type="radio" value="No" required />
                                            <label htmlFor="no">
                                                No
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-6 top15">
                                    <label>Are you sexually active?<span className='star'>*</span></label>
                                    <div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSexuallyActive} name="sexuallyActive" id="sexYes" type="radio" value="Yes" required />
                                            <label htmlFor="sexYes">
                                                Yes
                                            </label>
                                        </div>
                                        <div className="radio radio-inline">
                                            <input onChange={this.updateSexuallyActive} name="sexuallyActive" id="sexNo" type="radio" value="No" required />
                                            <label htmlFor="sexNo">
                                                No
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="row">
                                <div className="col-lg-2 col-md-2 col-sm-3 col-xs-5">
                                    <label>Age<span className='star'>*</span></label>
                                    <input onChange={this.updateAge} type="text" className="form-control" required />
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Country<span className='star'>*</span></label>
                            <input onChange={this.updateCountry} type="text" className="form-control" required />
                        </div>
                        <div className="form-group">
                            <label>Please include any additional comments below</label>
                            <textarea onChange={this.updateDescription} className="form-control" rows="5" />
                        </div>
                        <div className="category"><span className='star'>*</span> Required fields</div>
                    </div>
                    <div className="card-footer">
                        <button disabled={!this.state.canSubmit} type="submit" className="btn btn-fill btn-primary">Submit</button>
                    </div>
                </form>
                <Modal show={this.state.showBalanceTooLowModal}>
                    <Modal.Body>
                        <div className="row">
                            <div className="col text-center">
                                <h4>You need 15 MEDX to submit a case.</h4>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button onClick={this.handleCloseBalanceTooLowModal} type="button" className="btn btn-defult">Close</button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.showConfirmSubmissionModal}>
                    <Modal.Body>
                        <div className="row">
                            <div className="col text-center">
                                <h4>Are you sure?</h4>
                                <h5>This will cost 5-15 MEDX (depending on second opinion option)</h5>
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
                                <h4>Thank you! Your case submitted successfully.</h4>
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

export default withRouter(CreateCase);