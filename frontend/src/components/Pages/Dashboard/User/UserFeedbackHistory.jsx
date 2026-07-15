import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Button } from 'flowbite-react';
import { MessageSquareText, Star, Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import FeedbackService from '../../../../utils/FeedbackService';

const UserFeedbackHistory = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const perPage = 20;

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = page * perPage;
      const res = await FeedbackService.getUserFeedbackHistory(perPage, offset);
      if (res && res.results) {
        setFeedback(res.results);
        setTotal(res.total || 0);
      } else {
        setFeedback(Array.isArray(res) ? res : []);
        setTotal(Array.isArray(res) ? res.length : 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load feedback history.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const totalPages = Math.ceil(total / perPage);

  if (loading && feedback.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error && feedback.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400">{error}</p>
        <button onClick={fetchHistory} className="mt-4 text-brand-400 hover:text-brand-300 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-600/20">
          <MessageSquareText size={22} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">My Feedback</h1>
          <p className="text-gray-400 text-sm">Your submitted ad feedback</p>
        </div>
      </div>

      {feedback.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquareText size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No feedback submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map(fb => (
            <div
              key={fb.id}
              className="bg-elevated border border-elevated-border rounded-xl overflow-hidden hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {fb.rating && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: fb.rating }, (_, i) => (
                          <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    )}
                    {fb.is_bug_report && (
                      <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">Bug Report</span>
                    )}
                  </div>
                  {fb.video_title && (
                    <p className="text-white text-sm font-medium truncate">{fb.video_title}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    <Calendar size={12} className="inline mr-1" />
                    {fb.submitted_at ? new Date(fb.submitted_at).toLocaleDateString() : ''}
                  </p>
                  {fb.responses && Object.keys(fb.responses).length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === fb.id ? null : fb.id)}
                      className="mt-2 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      {expanded === fb.id ? (
                        <>Hide details <ChevronDown size={12} /></>
                      ) : (
                        <>View details <ChevronRight size={12} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {expanded === fb.id && (
                <div className="border-t border-elevated-border px-4 py-3 bg-surface">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {Object.entries(fb.responses).map(([key, value]) => {
                      if (key === 'comment' || key === 'rating') return null;
                      if (typeof value === 'number') return null;
                      const label = key.replace(/_/g, ' ');
                      return (
                        <div key={key} className="flex flex-col">
                          <span className="text-gray-500 text-xs capitalize">{label}</span>
                          <span className="text-gray-200">{String(value)}</span>
                        </div>
                      );
                    })}
                    {fb.responses.comment && (
                      <div className="col-span-full">
                        <span className="text-gray-500 text-xs">Comment</span>
                        <p className="text-gray-200 mt-0.5">{fb.responses.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                color="gray"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-gray-400 text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                color="gray"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserFeedbackHistory;
