import React from 'react';
import PropTypes from 'prop-types';

const colorMap = {
  blue: 'badge-blue',
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  gray: 'badge-gray',
  purple: 'badge-base bg-purple-500/20 text-purple-300',
  indigo: 'badge-base bg-indigo-500/20 text-indigo-300',
};

export const Badge = ({ color = 'gray', children, className = '', dot = false }) => (
  <span className={`${colorMap[color] || colorMap.gray} ${dot ? 'pl-1.5' : ''} ${className}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${color === 'green' ? 'bg-green-400' : color === 'red' ? 'bg-red-400' : color === 'yellow' ? 'bg-yellow-400' : color === 'blue' ? 'bg-brand-400' : 'bg-gray-400'}`} />}
    {children}
  </span>
);

Badge.propTypes = {
  color: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  dot: PropTypes.bool,
};

export default Badge;
