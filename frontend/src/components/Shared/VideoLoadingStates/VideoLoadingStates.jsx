import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, Inbox } from 'lucide-react';
import { Spinner } from 'flowbite-react';
import { Button } from '../../ui/Button';

export const LoadingState = ({ message = 'Loading videos...' }) => (
  <div className="flex items-center justify-center py-20 w-full">
    <div className="flex flex-col items-center gap-3">
      <Spinner size="xl" className="fill-brand-500" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  </div>
);

LoadingState.propTypes = { message: PropTypes.string };

export const ErrorState = ({ error, onDismiss, onBack }) => (
  <div className="flex items-center justify-center py-20 w-full px-4">
    <div className="text-center max-w-md">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={28} className="text-red-400" />
      </div>
      <p className="text-red-400 text-sm mb-4">{error}</p>
      {onBack && <Button variant="secondary" size="sm" onClick={onBack}>Go Back</Button>}
    </div>
  </div>
);

ErrorState.propTypes = {
  error: PropTypes.string.isRequired,
  onDismiss: PropTypes.func,
  onBack: PropTypes.func
};

export const EmptyState = ({
  title = 'No Videos Available',
  message = 'There are no public videos available at this time.',
  action,
  actionLink,
  actionText
}) => (
  <div className="flex flex-col items-center justify-center py-20 w-full">
    <div className="w-14 h-14 rounded-2xl bg-surface-600/50 flex items-center justify-center mb-4">
      <Inbox size={28} className="text-gray-500" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
    <p className="text-sm text-gray-400 mb-6 max-w-sm text-center">{message}</p>
    {(action || actionLink) ? (
      actionLink ? (
        <a href={actionLink}><Button variant="primary" size="md">{actionText || 'Upload Video'}</Button></a>
      ) : (
        <Button variant="primary" size="md" onClick={action}>{actionText || 'Clear Search'}</Button>
      )
    ) : null}
  </div>
);

EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.func,
  actionLink: PropTypes.string,
  actionText: PropTypes.string
};
