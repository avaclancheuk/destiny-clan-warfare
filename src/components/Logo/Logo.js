import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import Lockup from '../Lockup/Lockup'
import Icon from './logo.svg'

const sizes = [ 'small', 'medium' ]

const Logo = ({ size, className }) => {
  const baseClassName = 'logo'

  return (
    <h1 className={classNames(baseClassName, className)}>
      <LogoIcon size={size} />
      <LogoLockup size={size} />
    </h1>
  )
}

Logo.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(sizes)
}

const LogoIcon = ({ size, className }) => {
  const baseClassName = 'logo-icon'

  return (
    <Icon className={classNames(baseClassName, size && `${baseClassName}--${size}`, className)} />
  )
}

LogoIcon.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(sizes)
}

const LogoLockup = ({ size, className }) => {
  const baseClassName = 'logo-lockup'

  return (
    <Lockup className={classNames(baseClassName, size && `${baseClassName}--${size}`, className)}
      heading="Clan Warfare"
      kicker="Destiny"
    />
  )
}

LogoLockup.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(sizes)
}

const components = {
  Logo,
  LogoIcon,
  LogoLockup
}

export default components
