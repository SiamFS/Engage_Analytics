import React from 'react';
import PropTypes from 'prop-types';

const SkeletonCard = ({ aspectRatio = 'aspect-video', lines = 2, rounded = 'rounded-xl' }) => (
  <div className={`bg-elevated ${rounded} overflow-hidden shadow-card animate-pulse`}>
    <div className={`${aspectRatio} bg-surface-600`} />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-surface-600 rounded w-3/4" />
      {lines > 1 && <div className="h-3 bg-surface-600 rounded w-1/2" />}
    </div>
  </div>
);

SkeletonCard.propTypes = {
  aspectRatio: PropTypes.string,
  lines: PropTypes.number,
  rounded: PropTypes.string
};

export default SkeletonCard;
