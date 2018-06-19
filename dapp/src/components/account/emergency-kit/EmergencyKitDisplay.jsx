import React, { Component } from 'react';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faPrint from '@fortawesome/fontawesome-free-solid/faPrint';
import { MainLayoutContainer } from '~/layouts/MainLayout';
import { formatSecretKey } from '~/services/format-secret-key'
import { currentAccount } from '~/services/sign-in'

const EmergencyKitDisplay = class extends Component {
  handlePrint = () => {
    window.print()
  }

  render () {
    const secretKey = currentAccount().secretKey()

    return (
      <MainLayoutContainer>
        <div className="container">
          <div className='row'>
            <div className='col-xs-12 col-sm-10 col-sm-offset-1 col-md-8 col-md-offset-2'>
              <div className="card">
                <div className="card-header">
                  <h3 className="title card-title">
                    Hippocrates Emergency Kit
                  </h3>
                </div>

                <div className="card-body">
                  <h4>
                    This is your <b>Secret Key</b>
                  </h4>
                  <div className="well" role="alert">
                    <div className='secret-key__key'>
                      {formatSecretKey(secretKey)}
                    </div>
                  </div>

                  <br />

                  <div className="text-center">
                    <a onClick={this.handlePrint} className="btn btn-lg btn-success">
                      <FontAwesomeIcon
                        icon={faPrint}
                        size='lg' /> &nbsp;
                      Print
                    </a>
                  </div>
                  <h3 className='text-center'>
                    Or save this page for your records.
                  </h3>

                  <br />
                  <hr />
                  <br />

                  <p className="title">
                    To sign in on a new browser:
                  </p>
                  <ol>
                    <li>Ensure you are using a Web3-enabled browser and that the current account is <b>{this.props.account}</b></li>
                    <li>Go to the Hippocrates sign up page: <a href='/sign-up' target='_blank' rel="noopener noreferrer">/sign-up</a></li>
                    <li>Enter the above secret key</li>
                    <li>Enter a new master password to encrypt your data locally</li>
                    <li>Confirm the master password, then create your account</li>
                  </ol>

                  <hr />


                  <br />
                  <br />
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayoutContainer>
    );
  }
}

export { EmergencyKitDisplay };
