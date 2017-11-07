import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import identity from 'netlify-identity-widget'
import HoldingPage from '../components/HoldingPage/HoldingPage'
import { Logo } from '../components/Logo/Logo'
import Button from '../components/Button/Button'

import '../stylus/index.styl'

class MasterLayout extends Component {
  constructor (props) {
    super(props)

    this.state = { user: identity.currentUser() }

    identity.on('login', (user) => {
      this.setState({ user })
      identity.close()
    })
    identity.on('logout', () => this.setState({ user: null }))

    this.handleLogin = this.handleLogin.bind(this)
  }

  componentDidMount () {
    identity.init()
  }

  handleLogin (e) {
    e.preventDefault()
    identity.open()
  }

  render () {
    const { children, data } = this.props
    const { user } = this.state

    if (data.site.siteMetadata.enableIdentity && !user) {
      return (
        <div className="site-container">
          <Helmet>
            <meta name="robots" content="noindex,nofollow" />
          </Helmet>
          <HoldingPage>
            <Logo />
            <div className="button-group">
              <Button onClick={this.handleLogin}>Log in to view</Button>
            </div>
          </HoldingPage>
        </div>
      )
    }

    return (
      <div className="site-container">
        <Helmet
          defaultTitle={data.site.siteMetadata.title}
          titleTemplate={`%s | ${data.site.siteMetadata.title}`}
        >
          <html lang="en" />
          <meta name="description" content={data.site.siteMetadata.description} />
        </Helmet>
        {children}
      </div>
    )
  }
}

MasterLayout.propTypes = {
  children: PropTypes.node,
  data: PropTypes.object
}

export default MasterLayout
