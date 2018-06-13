import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import ReactTooltip from 'react-tooltip'
import { Button, Modal } from 'react-bootstrap'
import { BodyClass } from '~/components/BodyClass'
import { formatKey } from '~/services/format-key'

export const SecretKey = class extends Component {

  constructor(props) {
    super(props)

    this.state = {
      showTermsModal: false
    }
  }

  handleCloseTermsModal = (event) => {
    event.preventDefault();
    this.setState({ showTermsModal: false });
  }

  render () {
    return (
      <BodyClass isDark={true}>
        <div className='container'>
          <div className='row'>
            <div className='col-sm-8 col-sm-offset-2'>
              <h3 className='text-center text-white'>
                This is your <b>Secret Key</b>:
              </h3>
              <div className="form-wrapper form-wrapper--inverse form-wrapper--account">
                <div className="form-wrapper--body">
                  <div className="well" role="alert">
                    <div className='secret-key__key'>
                      {formatKey(this.props.secretKey)}
                    </div>
                  </div>
                  <ol>
                    <li>You’ll need this key to access your account from new devices and browsers.</li>
                    <li>Don't write it down; we’re going to give you an <b>Emergency Kit</b> that contains it.</li>
                  </ol>

                  <br />
                  <p>
                    By signing up you are agreeing to the terms:
                    &nbsp;<a onClick={(e) => this.setState({ showTermsModal: true })}>READ TERMS</a>
                  </p>
                  <ReactTooltip
                    effect='solid'
                    border={true}
                    multiline={true} />
                </div>

                <div className="form-wrapper--footer">
                  <div className='text-right'>
                    <button
                      className='btn btn-lg btn-primary'
                      onClick={this.props.onContinue}>
                      Continue
                    </button>
                  </div>
                </div>
              </div>

              <div className="account--extras">
                <p className='text-center text-white'>
                  Already have an account? <Link to='/sign-in' className='text-white'>Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <Modal show={this.state.showTermsModal}>
          <Modal.Header>
             <Modal.Title>
                Disclaimer:
              </Modal.Title>
           </Modal.Header>
          <Modal.Body>
            <p>
              Hippocrates is a decentralized application serving as an open bulletin
              board connecting users to dermatologists. The MedCredits team does not control or view
              user-physician encounters. Physician credentials are verified by nodes in the MedCredits’
              Token Curated Registry. The MedCredits team does not guarantee physician credentials nor
              control which physicians are able to participate in this decentralized application.
              Client side HIPAA-compliant encryption is used in an effort to maintain user confidentiality.
              However, we strongly advise users to avoid using any identifiers or images that
              could compromise confidentiality.  The Hippocrates app is in Beta, and users are urged to
              treat the application as such.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={this.handleCloseTermsModal}
              bsStyle="primary">
              OK
            </Button>
          </Modal.Footer>
        </Modal>
      </BodyClass>
    )
  }
}