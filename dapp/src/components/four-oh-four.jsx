import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'
import * as routes from '~/config/routes'
import { PageTitle } from '~/components/PageTitle'

function mapStateToProps (state) {
  const signedIn = state.account.signedIn
  return {
    signedIn
  }
}

export const FourOhFour = connect(mapStateToProps)(
  class _FourOhFour extends Component {
    render() {
      let dynamicHomePath = this.props.signedIn ? routes.PATIENTS_CASES : routes.HOME

      return (
        <div>
          <PageTitle renderTitle={(t) => t('pageTitles.fourOhFour')} />
          <div className='container'>
            <div className="card">
              <div className="row">
                <div className="col-xs-12">
                  <br />
                  <h1 className="title text-center">
                    404
                  </h1>
                </div>
              </div>

              <div className="card-body">
                <div className='row'>
                  <div className='col-xs-12 text-center'>
                    <p className='lead'>
                      The page you are looking for does not exist.
                    </p>
                    <hr />
                    <p>
                      <Link className="btn btn-info btn-lg" to={dynamicHomePath}>Go Back</Link>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )
    }
  }
)
