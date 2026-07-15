import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from 'flowbite-react';
import { MessageSquareText, Star, Calendar, ChevronRight } from 'lucide-react';
import FeedbackService from '../../../../utils/FeedbackService';
import { useNavigate } from 'react-router-dom';

const UserFeedbackHistory = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const navigate = useNavigate();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = page * perPage;
      const res = await FeedbackService.getUserFeedbackHistory(perPage, offset);
      setFeedback(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || 'Failed to load feedback history.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

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
          <p className="text-gray-400 text-sm">Your submitted analysis feedback</p>
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
              className="bg-elevated border border-elevated-border rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
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
                    {new Date(fb.submitted_at).toLocaleDateString()}
                  </p>
                  {fb.responses && Object.keys(fb.responses).length > 0 && (
                    <button
                      onClick={() => {/* expand */}}
                      className="mt-2 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      View details <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserFeedbackHistory;
