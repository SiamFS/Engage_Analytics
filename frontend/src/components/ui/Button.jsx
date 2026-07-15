import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  outline: 'btn-base text-gray-200 border border-elevated-border hover:bg-elevated-hover',
  link: 'btn-base text-brand-400 hover:text-brand-300 underline-offset-2 hover:underline p-0 h-auto',
};

const sizes = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={`${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    {...props}
  >
    {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />}
    {children}
  </button>
));

Button.displayName = 'Button';

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'outline', 'link']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Button;
