import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import PageContainer from '../page-container/PageContainer'
import Card from '../card/Card'
import Avatar from '../avatar/Avatar'
import { Lockup } from '../lockup/Lockup'
import Leaderboard from '../leaderboard/Leaderboard'
import RelativeDate from '../relative-date/RelativeDate'
import { StatList } from '../stat/Stat'
import { TagList } from '../tag/Tag'
import Notification from '../notification/Notification'

const constants = require('../../utils/constants')
const urlBuilder = require('../../utils/url-builder')
const possessive = require('../../utils/possessive')

class EventMember extends Component {
  render () {
    const { member } = this.props
    const leaderboard = member.history ? member.history.filter(({ game }) => game.path.length && game.type) : null
    const enableMatchHistory = JSON.parse(process.env.GATSBY_ENABLE_MATCH_HISTORY)
    const hasLeaderboard = leaderboard && leaderboard.length > 0
    const title = `${member.name} [${member.clanTag}] | ${constants.kicker.current}`
    const description = `${possessive(member.name)} stats and match history in the current ${constants.meta.name} event`
    const schema = {
      '@context': 'http://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: {
            '@id': `${process.env.GATSBY_SITE_URL}${urlBuilder.eventUrl(member.currentEventId)}`,
            name: constants.kicker.current
          }
        },
        {
          '@type': 'ListItem',
          position: 2,
          item: {
            '@id': `${process.env.GATSBY_SITE_URL}${urlBuilder.eventUrl(member.currentEventId, member.clanId.substring(constants.prefix.hash.length))}`,
            name: member.clanName
          }
        },
        {
          '@type': 'ListItem',
          position: 3,
          item: {
            '@id': `${process.env.GATSBY_SITE_URL}${urlBuilder.eventUrl(member.currentEventId, member.clanId.substring(constants.prefix.hash.length), member.id)}`,
            name: member.name
          }
        }
      ]
    }

    return (
      <PageContainer>
        <Helmet>
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
        <Lockup primary center kicker={constants.kicker.current} kickerHref={urlBuilder.eventUrl(member.currentEventId)}>
          <RelativeDate status />
        </Lockup>
        <Fragment>
          <Card cutout={hasLeaderboard} center>
            {member.icon &&
              <Avatar cutout outline icon={member.icon} />
            }
            <TagList tags={member.tags} className="card__tags" />
            <Lockup center reverse kicker={member.clanName} kickerHref={urlBuilder.eventUrl(member.currentEventId, member.clanId.substring(constants.prefix.hash.length))} heading={member.name} />
            <StatList stats={member.leaderboard} />
            {!hasLeaderboard &&
              <Notification>
                {enableMatchHistory ? (
                  `Match history is being calculated. Please check back later.`
                ) : (
                  `Match history is currently disabled.`
                )}
              </Notification>
            }
          </Card>
          {hasLeaderboard &&
            <Leaderboard cutout data={leaderboard} />
          }
        </Fragment>
        )}
      </PageContainer>
    )
  }
}

EventMember.propTypes = {
  member: PropTypes.object
}

export default EventMember
