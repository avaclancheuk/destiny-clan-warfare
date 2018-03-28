import React, { Component } from 'react'
import { withRouteData } from 'react-static'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import PageContainer from '../components/page-container/PageContainer'
import Card from '../components/card/Card'
import { Lockup } from '../components/lockup/Lockup'
import Leaderboard from '../components/leaderboard/Leaderboard'

const constants = require('../utils/constants')

class EventsPage extends Component {
  render () {
    const { data } = this.props
    const leaderboard = data.allEvent.map(event => {
      const typeSuffix = event.isCurrent ? constants.kicker.current : (event.isPast ? '' : constants.kicker.future)
      return {
        game: {
          path: event.path,
          type: `${event.name}${typeSuffix.length > 0 ? ` - ${typeSuffix}` : ''}`,
          startDate: event.startDate,
          endDate: event.endDate
        },
        modifiers: event.modifiers
      }
    })
    const title = 'Events'
    const description = `All ${constants.meta.name} events to date`

    return (
      <PageContainer {...this.props}>
        <Helmet>
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
        </Helmet>
        <Card cutout center>
          <Lockup primary center kicker="All" heading="Events" />
        </Card>
        <Leaderboard cutout data={leaderboard} />
      </PageContainer>
    )
  }
}

EventsPage.propTypes = {
  data: PropTypes.object
}

export default withRouteData(EventsPage)
