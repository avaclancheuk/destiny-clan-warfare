import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Card from '../card/Card'
import { Lockup } from '../lockup/Lockup'
import Timer from '../timer/Timer'
import { ModifierList } from '../modifier/Modifier'
import { Button } from '../button/Button'

const constants = require('../../utils/constants')

class FutureEvent extends Component {
  constructor (props) {
    super(props)

    this.state = {
      enrollmentOpen: false
    }
  }

  componentDidMount () {
    const enrollmentOpen = JSON.parse(localStorage.getItem('enrollmentOpen'))

    this.setState({ enrollmentOpen: enrollmentOpen })
  }

  render () {
    const { event, element, summary } = this.props
    const { enrollmentOpen } = this.state

    if (!event) return null

    return (
      <Card center>
        <Lockup center element={element} headingHref={summary && event.path} heading={event.name} />
        <Timer start={event.startDate} end={event.endDate} />
        {event.description &&
          <p>{event.description}</p>
        }
        <ModifierList modifiers={event.modifiers} />
        {enrollmentOpen &&
          <Button href={`/${constants.prefix.hash}${constants.prefix.enroll}`}>Enroll your clan today</Button>
        }
      </Card>
    )
  }
}

FutureEvent.defaultProps = {
  element: 'h1'
}

FutureEvent.propTypes = {
  event: PropTypes.object,
  element: PropTypes.string,
  summary: PropTypes.bool
}

export default FutureEvent
