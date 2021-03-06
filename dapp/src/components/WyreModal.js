import React, { Component } from 'react'
import ReactTimeout from 'react-timeout'

export const WyreModal = ReactTimeout(class _WyreModal extends Component {

  componentDidMount() {
    this.handler = new window.Wyre({
      apiKey: process.env.REACT_APP_WYRE_API_KEY,
      env: process.env.REACT_APP_WYRE_ENV,
      onExit: function (error) {
        if (error != null)
          console.error(error)
        else
          console.log("exited!")
      },
      onSuccess: function () {
        console.log("success!")
      }
    })
  }

  handleOpenWyre = (e) => {
    e.preventDefault()

    this.handler.open()
  }

  render () {
    return (
      <div>
        <button
          className="btn btn-primary"
          onClick={this.handleOpenWyre}
        >
          Pay with USD
        </button>
        <script src="/popper.min.js"></script>
        <script src="/bootstrap.min.js"></script>
      </div>
    )
  }
})
