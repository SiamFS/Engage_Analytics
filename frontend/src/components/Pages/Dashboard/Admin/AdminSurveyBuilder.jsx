import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Modal, Select } from 'flowbite-react';
import { ClipboardList, Plus, Edit3, Trash2, GripVertical, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import FeedbackService from '../../../../utils/FeedbackService';

const QUESTION_TYPES = [
  { value: 'star_rating', label: 'Star Rating' },
  { value: 'emoji_rating', label: 'Emoji Rating' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'text', label: 'Text' },
];

const AdminSurveyBuilder = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: [],
    is_required: false,
    is_active: true,
    section: 'general',
  });
  const [optionInput, setOptionInput] = useState('');

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await FeedbackService.adminGetQuestions();
      setQuestions(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const resetForm = () => {
    setForm({
      question_text: '',
      question_type: 'multiple_choice',
      options: [],
      is_required: false,
      is_active: true,
      section: 'general',
    });
    setOptionInput('');
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (q) => {
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || [],
      is_required: q.is_required,
      is_active: q.is_active,
      section: q.section || 'general',
    });
    setEditing(q);
    setShowModal(true);
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setForm(prev => ({ ...prev, options: [...prev.options, optionInput.trim()] }));
      setOptionInput('');
    }
  };

  const removeOption = (idx) => {
    setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        options: ['multiple_choice', 'checkbox'].includes(form.question_type) ? form.options : [],
      };
      if (editing) {
        await FeedbackService.adminUpdateQuestion(editing.id, payload);
      } else {
        await FeedbackService.adminCreateQuestion(payload);
      }
      setShowModal(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (qId) => {
    setDeletingId(qId);
    try {
      await FeedbackService.adminDeleteQuestion(qId);
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const moveQuestion = (idx, dir) => {
    const next = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((q, i) => (q.order = i));
    setQuestions(next);
    FeedbackService.adminReorderQuestions(next.map((q, i) => ({ id: q.id, order: i }))).catch(() => {});
  };

  if (loading && questions.length === 0) {
    return <div className="flex justify-center py-16"><Spinner size="xl" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors">
          <Plus size={16} /> Add Question
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {questions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No questions yet. Create your first one.</div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-elevated border border-elevated-border rounded-xl p-4 flex items-start gap-3 hover:border-white/20 transition-colors">
              <div className="flex flex-col gap-1 pt-0.5">
                <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}
                  className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => moveQuestion(idx, 1)} disabled={idx >= questions.length - 1}
                  className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white text-sm font-medium">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-surface-600 text-gray-300 px-2 py-0.5 rounded-full">
                        {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                      </span>
                      {q.is_required && <span className="text-xs text-red-400">Required</span>}
                      {!q.is_active && <span className="text-xs text-gray-500">Inactive</span>}
                      <span className="text-xs text-gray-500">{q.section}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(q)}
                      className="p-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-white transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(q.id)} disabled={deletingId === q.id}
                      className="p-1.5 rounded-lg bg-surface-600 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {q.options?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map(opt => (
                      <span key={opt} className="text-xs bg-surface-600 text-gray-400 px-2 py-0.5 rounded-md">{opt}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)}
        theme={{ content: { inner: 'relative max-h-[90dvh] flex flex-col rounded-lg bg-elevated shadow' } }}
        size="lg">
        <Modal.Header><span className="text-white">{editing ? 'Edit Question' : 'Add Question'}</span></Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Question Text</label>
            <input value={form.question_text} onChange={e => setForm(prev => ({ ...prev, question_text: e.target.value }))}
              className="w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="How was your experience?" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Type</label>
            <Select value={form.question_type} onChange={e => setForm(prev => ({ ...prev, question_type: e.target.value, options: [] }))}
              className="w-full">
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          {['multiple_choice', 'checkbox'].includes(form.question_type) && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Options</label>
              <div className="flex gap-2 mb-2">
                <input value={optionInput} onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  className="flex-1 bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Add option..." />
                <button onClick={addOption} className="px-3 py-2 bg-surface-500 hover:bg-surface-400 text-white text-sm rounded-lg">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.options.map((opt, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-surface-600 text-gray-300 px-2 py-1 rounded-md">
                    {opt}
                    <button onClick={() => removeOption(i)} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_required}
                onChange={e => setForm(prev => ({ ...prev, is_required: e.target.checked }))}
                className="rounded text-brand-500 focus:ring-brand-500" />
              <span className="text-sm text-gray-300">Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded text-brand-500 focus:ring-brand-500" />
              <span className="text-sm text-gray-300">Active</span>
            </label>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-t border-elevated-border">
          <button onClick={handleSave} disabled={saving || !form.question_text.trim()}
            className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg">
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
          <button onClick={() => setShowModal(false)}
            className="px-4 py-2 text-sm bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminSurveyBuilder;
