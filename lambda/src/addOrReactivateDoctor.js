import 'idempotent-babel-polyfill'
import Eth from 'ethjs'
import { Hippo } from './lib/Hippo'

const hippo = new Hippo({
  privateKey: process.env.LAMBDA_CONFIG_PRIVKEY,
  providerUrl: process.env.LAMBDA_CONFIG_PROVIDER_URL,
  networkId: process.env.LAMBDA_CONFIG_NETWORK_ID
})

exports.handler = function (event, context, callback) {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.LAMBDA_CONFIG_CORS_ORIGIN
  }

  try {
    let ethAddress, name, publicKey
    let country = ''
    let region = ''
    let isDermatologist = true

    if (event.queryStringParameters !== null && event.queryStringParameters !== undefined) {
      if (event.queryStringParameters.ethAddress !== undefined &&
        event.queryStringParameters.ethAddress !== null &&
        event.queryStringParameters.ethAddress !== "") {
        ethAddress = event.queryStringParameters.ethAddress
      }
      if (event.queryStringParameters.name !== undefined &&
        event.queryStringParameters.name !== null &&
        event.queryStringParameters.name !== "") {
        name = event.queryStringParameters.name
      }
      if (event.queryStringParameters.country !== undefined &&
        event.queryStringParameters.country !== null &&
        event.queryStringParameters.country !== "") {
        country = event.queryStringParameters.country
      }
      if (event.queryStringParameters.region !== undefined &&
        event.queryStringParameters.region !== null &&
        event.queryStringParameters.region !== "") {
        region = event.queryStringParameters.region
      }
      if (event.queryStringParameters.publicKey !== undefined &&
        event.queryStringParameters.publicKey !== null &&
        event.queryStringParameters.publicKey !== "") {
        publicKey = event.queryStringParameters.publicKey
      }
    }

    console.info('Upgrading ' + ethAddress + 'to be a doctor named ' + name + ' in: ' + country + ', ' + region)

    if (!Eth.isAddress(ethAddress)) {
      callback(`ethAddress is not a valid address: ${ethAddress}`)
    } else if (!name) {
      callback(`name is not valid, please enter a name`)
    } else if (!country) {
      callback(`country is not valid, please enter a country`)
    } else if (!publicKey) {
      callback(`you must pass a publicKey`)
    } else {
      console.info('hippo.addOrReactivateDoctor ' + ethAddress + ' to be a doctor named ' + name + ' with public key ' + publicKey)
      hippo.addOrReactivateDoctor(ethAddress, name, country, region, isDermatologist, publicKey)
        .then((transactionHash) => {
          console.info('Successfully sent transaction with hash: ', transactionHash)
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
