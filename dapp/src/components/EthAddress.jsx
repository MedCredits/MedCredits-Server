import React, { Component } from 'react'
import PropTypes from 'prop-types'

export const EthAddress = class extends Component {
  constructor (props) {
    super(props)
    this.state = {
      showFull: props.showFull
    }
  }

  toggleFull () {
    this.setState({ showFull: !this.state.showFull })
  }

  render () {
    var address = (this.props.address === undefined) ? '?' : this.props.address.toString()

    if (this.state.showFull) {
      var displayed =
        <span className='tag address__full'>{address}</span>
    } else {
      displayed = <span onClick={() => this.toggleFull()} className="address__short">
        {address.substring(0, 10)} ...
      </span>
    }

    return (
      <span title={address} className='address'>
        {displayed}
      </span>
    )
  }
}

EthAddress.propTypes = {
  address: PropTypes.string,
  showFull: PropTypes.bool
}

EthAddress.defaultProps = {
  showFull: false
}
