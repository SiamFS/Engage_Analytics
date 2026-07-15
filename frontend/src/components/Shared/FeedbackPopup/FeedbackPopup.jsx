import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Send, ChevronRight, ThumbsUp } from 'lucide-react';
import FeedbackService from '../../../utils/FeedbackService';

const FeedbackPopup = ({ videoId, onClose, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState('prompt');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    FeedbackService.getActiveQuestions().then(setQuestions).catch(() => {});
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, []);

  const hasRequired = questions
    .filter(q => q.is_active !== false && q.is_required)
    .every(q => {
      if (q.question_type === 'text') return (answers[q.id] || '').trim().length > 0;
      if (q.question_type === 'checkbox') return (answers[q.id] || []).length > 0;
      return answers[q.id] !== undefined && answers[q.id] !== '';
    });

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleStart = () => {
    setStep('questions');
  };

  const handleSkip = () => {
    dismiss();
  };

  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        video: videoId || null,
        responses: { ...answers, comment, rating },
        rating: rating || null,
        is_anonymous: false,
        source: 'post_analysis',
      };
      await FeedbackService.submitFeedback(payload);
      setDone(true);
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          onComplete && onComplete();
          onClose();
        }, 300);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={active ? { opacity: 1, y: 0, scale: 1 } : {}}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="relative p-6">
              {done ? (
                <div className="text-center py-6">
                  <div className="mx-auto w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <ThumbsUp size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-1">Feedback Submitted!</h3>
                  <p className="text-gray-300 text-sm">Thank you for rating this ad.</p>
                </div>
              ) : step === 'prompt' ? (
                <div className="text-center py-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
                    <ThumbsUp size={28} className="text-brand-400" />
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">What did you think of this ad?</h3>
                  <p className="text-gray-300 text-sm mb-6">
                    Your opinion helps advertisers create better content.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleStart}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      Rate This Ad <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={handleSkip}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl text-sm font-medium transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-custom">
                  <h3 className="text-white font-semibold">Rate This Advertisement</h3>

                  {questions
                    .filter(q => q.is_active !== false)
                    .map(q => (
                      <div key={q.id}>
                        <p className="text-sm text-gray-200 mb-2">
                          {q.question_text}
                          {q.is_required && <span className="text-red-400 ml-1">*</span>}
                        </p>
                        {q.question_type === 'star_rating' || q.question_type === 'emoji_rating' ? (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => { setRating(n); handleAnswer(q.id, n); }}
                                onMouseEnter={() => setHoverRating(n)}
                                onMouseLeave={() => setHoverRating(0)}
                                className={`p-1 transition-transform ${
                                  (hoverRating || rating) >= n ? 'scale-110' : ''
                                }`}
                              >
                                <Star
                                  size={28}
                                  className={`${
                                    n <= (hoverRating || rating)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-500'
                                  } transition-colors`}
                                />
                              </button>
                            ))}
                          </div>
                        ) : q.question_type === 'multiple_choice' ? (
                          <div className="space-y-1.5">
                            {q.options.map(opt => (
                              <label
                                key={opt}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                  answers[q.id] === opt
                                    ? 'bg-brand-600/30 border border-brand-500/50'
                                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  value={opt}
                                  checked={answers[q.id] === opt}
                                  onChange={() => handleAnswer(q.id, opt)}
                                  className="text-brand-500 focus:ring-brand-500"
                                />
                                <span className="text-gray-200 text-sm">{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : q.question_type === 'checkbox' ? (
                          <div className="space-y-1.5">
                            {q.options.map(opt => {
                              const val = answers[q.id] || [];
                              const checked = val.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                    checked
                                      ? 'bg-brand-600/30 border border-brand-500/50'
                                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    value={opt}
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked ? val.filter(v => v !== opt) : [...val, opt];
                                      handleAnswer(q.id, next);
                                    }}
                                    className="rounded text-brand-500 focus:ring-brand-500"
                                  />
                                  <span className="text-gray-200 text-sm">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : q.question_type === 'text' ? (
                          <textarea
                            value={answers[q.id] || ''}
                            onChange={e => handleAnswer(q.id, e.target.value)}
                            placeholder="Your thoughts on this ad..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                          />
                        ) : null}
                      </div>
                    ))}

                  <div>
                    <p className="text-sm text-gray-200 mb-2">Anything else?</p>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Tell us what you liked or disliked about this ad..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || (questions.length > 0 && !hasRequired)}
                      className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <button
                      onClick={handleSkip}
                      disabled={submitting}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-gray-200 rounded-xl text-sm font-medium transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackPopup;
