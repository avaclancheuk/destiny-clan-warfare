import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import identity from 'netlify-identity-widget'
import HoldingPage from '../components/holding-page/HoldingPage'
import { Logo } from '../components/logo/Logo'
import { Button, ButtonGroup } from '../components/button/Button'
import ogImage from '../images/favicon-1200x1200.png'

import '../stylus/index.styl'

const constants = require('../utils/constants')
const enableIdentity = JSON.parse(process.env.GATSBY_ENABLE_IDENTITY)
const enableIdentityLogin = JSON.parse(process.env.GATSBY_ENABLE_IDENTITY_LOGIN)

class MasterLayout extends Component {
  constructor (props) {
    super(props)

    this.state = {
      user: identity.currentUser(),
      enableIdentity: false,
      enableIdentityLogin: enableIdentityLogin
    }

    identity.on('login', (user) => {
      this.setState({ user: user })
      identity.close()
    })
    identity.on('logout', () => this.setState({ user: null }))

    this.handleLogin = this.handleLogin.bind(this)
  }

  componentDidMount () {
    this.setState({ enableIdentity: enableIdentity })
    identity.init()

    if (!enableIdentityLogin) identity.logout()
  }

  handleLogin (e) {
    e.preventDefault()
    identity.open()
  }

  render () {
    const { children } = this.props
    const { user, enableIdentity, enableIdentityLogin } = this.state
    const { title, name, description, handle } = constants.meta

    return (
      <div className="site-container">
        <Helmet
          defaultTitle={title}
          titleTemplate={`%s | ${name}`}
        >
          <html lang="en" />
          <meta name="description" content={description} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={name} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:image" content={`${process.env.GATSBY_SITE_URL}${ogImage}`} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:domain" content={process.env.GATSBY_SITE_URL} />
          <meta name="twitter:site" content={handle} />
          <meta name="twitter:creator" content={handle} />
        </Helmet>
        {(enableIdentity && !user) ? (
          <HoldingPage>
            <Logo />
            {enableIdentityLogin &&
              <ButtonGroup>
                <Button onClick={this.handleLogin}>Log in to view</Button>
              </ButtonGroup>
            }
          </HoldingPage>
        ) : (
          children
        )}
      </div>
    )
  }
}

MasterLayout.propTypes = {
  children: PropTypes.node
}

export default MasterLayout
