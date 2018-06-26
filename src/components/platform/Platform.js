import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import MultiSort from 'multi-sort'
import Icon from '../icon/Icon'
import BattlenetSvg from './icons/battlenet.svg'
import PlaystationSvg from './icons/playstation.svg'
import XboxSvg from './icons/xbox.svg'
import styles from './Platform.styl'

const baseClassName = 'platform'
const allowedPlatforms = [
  { id: 1, Svg: XboxSvg, name: 'Xbox Live' },
  { id: 2, Svg: PlaystationSvg, name: 'PlayStation Network' },
  { id: 4, Svg: BattlenetSvg, name: 'Battle.net' }
]

class Platform extends PureComponent {
  render () {
    const { platform, size } = this.props
    const { Svg, name } = allowedPlatforms.find(({ id }) => id === platform.id)

    if (!Svg) return null

    return (
      <div className={classNames(styles[baseClassName], size && styles[`${baseClassName}--${size}`])}>
        <Icon a11yText={name} className={styles[`${baseClassName}__icon`]}>
          <Svg />
        </Icon>
      </div>
    )
  }
}

Platform.propTypes = {
  platform: PropTypes.object,
  size: PropTypes.oneOf([ 'small' ])
}

class PlatformList extends PureComponent {
  render () {
    const { size, className } = this.props
    var { platforms } = this.props

    platforms = MultiSort(platforms.filter(platform => platform.percentage >= 10), {
      size: 'DESC',
      active: 'DESC',
      id: 'ASC'
    })

    if (!platforms || platforms.length < 1) return null

    return (
      <ul className={classNames('list--inline', styles[`${baseClassName}-list`], className)}>
        {platforms.map((platform, i) => (
          <li key={i}>
            <Platform platform={platform} size={size} />
          </li>
        ))}
      </ul>
    )
  }
}

PlatformList.propTypes = {
  platforms: PropTypes.arrayOf(PropTypes.object),
  size: PropTypes.oneOf([ 'small' ]),
  className: PropTypes.string
}

export {
  Platform,
  PlatformList
}
