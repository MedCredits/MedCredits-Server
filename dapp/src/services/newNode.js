const WebRTCStar = require('libp2p-webrtc-star')
// const WebSockets = require('libp2p-websockets')
// const WebSocketStar = require('libp2p-websocket-star')
const Mplex = require('libp2p-mplex')
// const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')
// const Bootstrap = require('libp2p-bootstrap')
const defaultsDeep = require('@nodeutils/defaults-deep')
const libp2p = require('libp2p')
// const KadDHT = require('libp2p-kad-dht')

// Find this list at: https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/config-browser.json
// const bootstrapers = [
//   '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
//   '/dns4/sfo-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
//   '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
//   '/dns4/sfo-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
//   '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
//   '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
//   '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
//   '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
//   '/dns4/wss0.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
//   '/dns4/wss1.bootstrap.libp2p.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
// ]

export function newNode(_options) {
  const wrtcStar = new WebRTCStar({ id: _options.peerInfo.id })

  const defaults = {
    modules: {
      transport: [
        wrtcStar
      ],
      streamMuxer: [
        Mplex
      ],
      connEncryption: [
        SECIO
      ],
      peerDiscovery: [
        wrtcStar.discovery
      ]
    },
    config: {
      peerDiscovery: {
        webRTCStar: {
          enabled: true
        }/*,
        bootstrap: {
          interval: 10000,
          enabled: true,
          list: bootstrapers
        },
        websocketStar: {
          enabled: true
        }*/
      },
      /*
      relay: {
        enabled: false,
        hop: {
          enabled: false,
          active: false
        }
      },*/
      EXPERIMENTAL: {
        dht: false,
        pubsub: true
      },
      dht: {
        kBucketSize: 20
      }
    }
  }

  const allOptions = defaultsDeep(_options, defaults)

  return new libp2p(allOptions)
}