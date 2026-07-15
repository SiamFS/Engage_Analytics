import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

const sizes = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
};

export const Spinner = ({ size = 'md', className = '' }) => (
  <Loader2
    size={sizes[size] || sizes.md}
    className={`animate-spin text-brand-400 ${className}`}
  />
);

Spinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

export default Spinner;
