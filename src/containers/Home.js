import React, { PureComponent, Fragment } from 'react'
import { withRouteData } from 'react-static'
import PropTypes from 'prop-types'
import PageContainer from '../components/page-container/PageContainer'
import { Button, ButtonGroup } from '../components/button/Button'
import { Lockup } from '../components/lockup/Lockup'
import RelativeDate from '../components/relative-date/RelativeDate'
import Advert from '../components/advert/Advert'
import Enrollment from '../components/enrollment/Enrollment'
import EventCurrent from '../components/event/Current'
import EventPrevious from '../components/event/Previous'
import EventFuture from '../components/event/Future'
import LogoImage from '../images/avatar-512x512.jpg'

const constants = require('../utils/constants')
const urlBuilder = require('../utils/url-builder')

const meta = {
  schema: {
    '@context': 'http://schema.org',
    '@type': 'Organization',
    name: constants.meta.name,
    url: process.env.SITE_URL,
    logo: `${LogoImage}`,
    sameAs: [
      constants.social.twitter
    ]
  }
}

class HomeContainer extends PureComponent {
  constructor (props) {
    super(props)

    const { events, currentEventLeaderboards, currentEventId, previousEventId } = this.props
    const currentEvent = events.find(({ id }) => id === currentEventId)
    const previousEvent = events.find(({ id }) => id === previousEventId)
    const nextEvent = events.filter(({ isFuture }) => isFuture).pop()

    this.state = {
      currentEventLeaderboards: currentEvent ? currentEventLeaderboards : null,
      currentEvent,
      previousEvent,
      nextEvent
    }
  }

  render () {
    const { apiStatus, clans } = this.props
    const { currentEventLeaderboards, currentEvent, previousEvent, nextEvent } = this.state

    return (
      <PageContainer meta={meta}>
        <Enrollment apiStatus={apiStatus} clans={clans} />
        {currentEvent ? (
          <Fragment>
            <Lockup id="current" primary center element="h1" kicker={constants.kicker.current}>
              <RelativeDate apiStatus={apiStatus} />
            </Lockup>
            <EventCurrent event={currentEvent} leaderboards={currentEventLeaderboards} element="h2" summary />
            {previousEvent &&
              <Fragment>
                <Advert />
                <Lockup id="previous" center primary element="h1" kicker={constants.kicker.previous} />
                <EventPrevious event={previousEvent} element="h2" summary />
              </Fragment>
            }
            {nextEvent &&
              <Fragment>
                {previousEvent &&
                  <Advert />
                }
                <Lockup id="next" center primary element="h1" kicker={constants.kicker.next} />
                <EventFuture event={nextEvent} element="h2" summary />
              </Fragment>
            }
          </Fragment>
        ) : (
          <Fragment>
            {nextEvent &&
              <Fragment>
                <Lockup id="next" center primary element="h1" kicker={constants.kicker.next} />
                <EventFuture event={nextEvent} element="h2" summary />
              </Fragment>
            }
            {previousEvent &&
              <Fragment>
                {nextEvent &&
                  <Advert />
                }
                <Lockup id="previous" center primary element="h1" kicker={constants.kicker.previous} />
                <EventPrevious event={previousEvent} element="h2" summary />
              </Fragment>
            }
          </Fragment>
        )}
        <ButtonGroup>
          <Button href={urlBuilder.eventRootUrl}>View all events</Button>
        </ButtonGroup>
      </PageContainer>
    )
  }
}

HomeContainer.propTypes = {
  apiStatus: PropTypes.object,
  clans: PropTypes.array,
  events: PropTypes.array,
  currentEventLeaderboards: PropTypes.array,
  currentEventId: PropTypes.number,
  previousEventId: PropTypes.number
}

export default withRouteData(HomeContainer)
