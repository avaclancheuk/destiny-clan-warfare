import React, { Fragment } from 'react'
import Helmet from 'react-helmet'
import PropTypes from 'prop-types'
import Header from '../header/Header'
import Footer from '../footer/Footer'
import Advert from '../advert/Advert'
import BungieStatus from '../bungie/Status'

import './PageContainer.styl'

const PageContainer = ({ children, canonical }) => {
  const canonicalUrl = `${process.env.GATSBY_SITE_URL}${canonical}`

  return (
    <Fragment>
      {canonical &&
        <Helmet>
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:url" key="ogUrl" content={canonicalUrl} />
        </Helmet>
      }
      <Header />
      <BungieStatus />
      <main id="content" className="page-container" role="main">
        <div className="page-container__inner content-center content-gutter">
          {children}
          <Advert />
        </div>
      </main>
      <Footer />
    </Fragment>
  )
}

PageContainer.propTypes = {
  children: PropTypes.node,
  canonical: PropTypes.string
}

export default PageContainer
