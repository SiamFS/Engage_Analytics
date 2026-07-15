import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

export const Modal = ({
  show,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeable = true,
}) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && closeable) onClose();
    };
    if (show) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [show, onClose, closeable]);

  if (!show) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef && closeable) onClose(); }}
    >
      <div
        className={`w-full ${sizes[size] || sizes.md} bg-elevated border border-elevated-border rounded-2xl shadow-modal animate-scale-in max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-elevated-border shrink-0">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {closeable && (
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-elevated-hover transition-colors" type="button" aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto flex-1 text-gray-300 text-sm">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-elevated-border flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl']),
  closeable: PropTypes.bool,
};

export default Modal;
