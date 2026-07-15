import React from 'react';
import PropTypes from 'prop-types';

const variants = {
  base: 'card-base p-5',
  hover: 'card-hover p-5',
  glass: 'card-glass p-5',
  elevated: 'card-base p-6 shadow-elevated',
  interactive: 'card-base p-5 cursor-pointer hover:border-surface-400 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200',
};

export const Card = ({ variant = 'base', className = '', children, ...props }) => (
  <div className={`${variants[variant] || variants.base} ${className}`} {...props}>
    {children}
  </div>
);

Card.propTypes = {
  variant: PropTypes.oneOf(['base', 'hover', 'glass', 'elevated', 'interactive']),
  className: PropTypes.string,
  children: PropTypes.node,
};

export default Card;
