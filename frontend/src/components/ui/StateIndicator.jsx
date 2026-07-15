import React from 'react';
import PropTypes from 'prop-types';
import Spinner from './Spinner';

export const LoadingState = ({ message = 'Loading...', fullPage = false }) => (
  <div className={`flex items-center justify-center ${fullPage ? 'min-h-[60vh]' : 'py-16'}`}>
    <div className="flex flex-col items-center gap-3">
      <Spinner size="xl" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  </div>
);

LoadingState.propTypes = {
  message: PropTypes.string,
  fullPage: PropTypes.bool,
};

export const ErrorState = ({ error, onRetry, fullPage = false }) => (
  <div className={`flex items-center justify-center ${fullPage ? 'min-h-[60vh]' : 'py-16'} px-4`}>
    <div className="text-center max-w-md">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-red-400 text-2xl font-bold">!</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Something went wrong</h3>
      <p className="text-sm text-gray-400 mb-6">{error || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary btn-md" type="button">
          Try Again
        </button>
      )}
    </div>
  </div>
);

ErrorState.propTypes = {
  error: PropTypes.string,
  onRetry: PropTypes.func,
  fullPage: PropTypes.bool,
};

export default LoadingState;
