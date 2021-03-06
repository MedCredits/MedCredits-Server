import 'idempotent-babel-polyfill'
import Eth from 'ethjs'
import { Hippo } from './lib/Hippo'

const config = {
  privateKey: process.env.LAMBDA_CONFIG_PRIVKEY,
  providerUrl: process.env.LAMBDA_CONFIG_PROVIDER_URL,
  networkId: process.env.LAMBDA_CONFIG_NETWORK_ID
}
const hippo = new Hippo(config)

exports.handler = function (event, context, callback) {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.LAMBDA_CONFIG_CORS_ORIGIN
  }

  // Avoid printing the privateKey to the Netlify logs:
  console.log('Using: ', config.providerUrl)
  console.log('Using: ', config.networkId)

  try {
    let ethAddress

    if (event.queryStringParameters !== null && event.queryStringParameters !== undefined) {
      if (event.queryStringParameters.ethAddress !== undefined &&
        event.queryStringParameters.ethAddress !== null &&
        event.queryStringParameters.ethAddress !== "") {
        ethAddress = event.queryStringParameters.ethAddress;
      }
    }

    console.log('Sending MedX to ', ethAddress)

    if (!Eth.isAddress(ethAddress)) {
      callback(`ethAddress is not a valid address: ${ethAddress}`)
    } else {
      hippo.sendMedX(ethAddress)
        .then((transactionHash) => {
          console.log('Successfully sent transaction with hash: ', transactionHash)
          callback(null, {
            statusCode: 200,
            body: JSON.stringify({ txHash: transactionHash }),
            headers: responseHeaders
          })
        })
        .catch(error => {
          console.error('ERROR: ', error)
          callback(error)
        })
    }

  } catch (error) {
    console.error('MASSIVE ERROR: ', error)
    callback(error)
  }
}
