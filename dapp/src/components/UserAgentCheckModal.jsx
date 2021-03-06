import React, { Component } from 'react'
import { Modal } from 'react-bootstrap'
import getWeb3 from '~/get-web3'
import AppStoreButtonImg from '~/assets/img/button--app-store.png'
import PlayStoreButtonImg from '~/assets/img/button--play-store.png'
import { getMobileOperatingSystem } from '~/utils/getMobileOperatingSystem'

function unsupportedBrowser() {
  const _web3 = getWeb3()
  const userAgent = navigator.userAgent || navigator.vendor || window.opera

  // Cipher & Status are not supported
  // Cipher is discontinued
  // Status doesn't support file uploads and is not ready for production
  if (/Cipher/.test(userAgent)) {
    return true
  } else if (_web3 && _web3.givenProvider && _web3.givenProvider.isStatus) {
    return true
  }

  return false
}

export const UserAgentCheckModal = class _UserAgentCheckModal extends Component {
  constructor(props) {
    super(props)

    this.state = {
      hidden: false
    }
  }

  handleCloseModal = () => {
    this.setState({
      hidden: true
    })
  }

  render () {
    const isVisible = unsupportedBrowser() && !this.state.hidden

    const androidLink = <a
        href="https://play.google.com/store/apps/details?id=org.toshi&hl=en_CA"
        target="_blank"
        rel="noopener noreferrer"
        title="Download Coinbase Wallet from Google Play Store">
        <img src={PlayStoreButtonImg} alt="Google Play Store Button" width="120" />
      </a>

    const iOSLink = <a
        href="https://itunes.apple.com/us/app/coinbase-wallet/id1278383455?mt=8"
        target="_blank"
        rel="noopener noreferrer"
        title="Download Coinbase Wallet from Apple App Store">
        <img src={AppStoreButtonImg} alt="Apple App Store Button" width="120" />
      </a>

    const link = getMobileOperatingSystem() === 'iOS' ? iOSLink : androidLink

    return (
      <Modal show={isVisible}>
        <Modal.Header>
          <div className="row">
            <div className="col-xs-12 text-center">
              <h4>
                Unsupported Browser
              </h4>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <p>
              You are using an unsupported mobile dApp browser which has many bugs which will affect your OpenCare experience.
            </p>
            <p>
              We recommend using the Coinbase Wallet dApp browser:
            </p>
            <br />
            {link}
            <br />
            <br />
            <hr />
            <br />

            <p>
              <br />
              <a onClick={this.handleCloseModal}>ignore this warning</a>
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
        </Modal.Footer>
      </Modal>
    )
  }
}
