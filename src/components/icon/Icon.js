import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import styles from './Icon.styl'

const baseClassName = 'icon'

export default function Icon ({ children, a11yText, className, height, width }) {
  const iconClassNames = classNames(
    styles[baseClassName],
    (width || height) && styles[`${baseClassName}--custom-size`],
    className
  )

  return (
    <i
      className={iconClassNames}
      aria-hidden={!a11yText ? 'true' : null}
      style={{
        width: width && `${width}px`,
        height: height && `${height}px`,
        lineHeight: height && `${height}px`
      }}
      >
      {a11yText &&
        <span className="is-vhidden">{a11yText}</span>
      }
      {children}
    </i>
  )
}

Icon.propTypes = {
  children: PropTypes.node.isRequired,
  a11yText: PropTypes.string,
  className: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number
}
