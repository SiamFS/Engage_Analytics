import React from 'react';
import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No data',
  message = 'Nothing to show here yet.',
  action,
  actionText,
  actionLink,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-14 h-14 rounded-2xl bg-surface-600/50 flex items-center justify-center mb-4">
      <Icon size={28} className="text-gray-500" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
    <p className="text-sm text-gray-400 mb-6 max-w-sm text-center">{message}</p>
    {(action || actionLink) && (
      actionLink ? (
        <a href={actionLink}><Button variant="primary" size="md">{actionText || 'Go'}</Button></a>
      ) : (
        <Button variant="primary" size="md" onClick={action}>{actionText || 'Go'}</Button>
      )
    )}
  </div>
);

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.func,
  actionText: PropTypes.string,
  actionLink: PropTypes.string,
};

export default EmptyState;
