import React, { Component } from 'react'
import { EthAddress } from '~/components/EthAddress'
import PropTypes from 'prop-types'
import axios from 'axios';
import { LoadingLines } from '~/components/LoadingLines'
import medXLogoImg from '~/assets/img/medx-logo.png'
import medXLogoImg2x from '~/assets/img/medx-logo@2x.png'

export const MedXFaucetAPI = class extends Component {

  constructor(props) {
    super(props)

    this.state = {
      isSending: false,
      errorMessage: '',
      response: {}
    }
  }

  handleSendMedX = (event) => {
    event.preventDefault()
    this.setState({
      isSending: true,
      errorMessage: '',
      response: {}
    }, this.doSendMedX)
  }

  doSendMedX = async () => {
    const faucetLambdaURI = `${process.env.REACT_APP_LAMBDA_BETA_FAUCET_ENDPOINT_URI}/betaFaucetSendMedX`

    try {
      const response = await axios.get(`${faucetLambdaURI}?ethAddress=${this.props.address}`)

      if (response.status === 200) {
        this.setState({
          responseMessage: "15 MedX is on the way",
          txHash: response.data.txHash,
          isSending: false
        })

        this.props.moveToNextStep()
      } else {
        this.setState({
          responseMessage: '',
          errorMessage: `There was an error: ${response.data}`,
          isSending: false
        })
      }
    } catch (error) {
      this.setState({
        responseMessage: '',
        errorMessage: error.message,
        isSending: false
      })
    }
  }

  render () {
    const { isSending, responseMessage, errorMessage } = this.state

    if (errorMessage) {
      var englishErrorMessage = (
        <small>
          <br />
          There was an error while sending you MedX, you may have already received it or it's on the way. If the problem persists please contact MedCredits on Telegram and we can send you Ropsten Testnet MedX:
          &nbsp; <a
            target="_blank"
            href="https://t.me/MedCredits"
            rel="noopener noreferrer">Contact Support</a>
        </small>
      )

      var errorParagraph = (
        <p className="text-danger">
          {errorMessage}
          {englishErrorMessage}
          <br />
          <br />
        </p>
      )
    }

    if (responseMessage) {
      var successParagraph = (
        <p>
          <strong>{responseMessage}</strong>
          <small>
            <br/>
            Please wait, this may take up to a couple of minutes ...
          </small>
        </p>
      )
    }

    const responseWell = (
      <div className="well">
        <LoadingLines visible={isSending} /> &nbsp;
        {successParagraph}
        {errorParagraph}
      </div>
    )

    return (
      <div className="col-xs-12 text-center">
        <strong>Current MedX Balance:</strong>
        <h2 className="header--no-top-margin">
          {this.props.medXBalance}
          <img
            src={medXLogoImg}
            alt="MedX Logo"
            srcSet={`${medXLogoImg} 1x, ${medXLogoImg2x} 2x`}
          />
        </h2>
        <p className="small text-center">
          <span className="eth-address text-gray">For address:&nbsp;
            <EthAddress address={this.props.address} />
          </span>
        </p>
        <hr />
        <p>
          To submit a case to a doctor you will need MedX.
          <br />We can send you 15 MedX to get started:
        </p>
        <p>
          <a
            disabled={isSending}
            onClick={this.handleSendMedX}
            className="btn btn-lg btn-primary"
          >{isSending ? 'Sending ...' : 'Send Me MedX'}</a>
          <br />
          <br />
          <a onClick={this.props.moveToNextStep}>skip this for now</a>
        </p>
        <br />
        {isSending || responseMessage || errorMessage ? responseWell : ''}
      </div>
    )
  }
}

MedXFaucetAPI.propTypes = {
  medXBalance: PropTypes.string,
  address: PropTypes.string
}