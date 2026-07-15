import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, Textarea, Select, Button, Spinner } from 'flowbite-react';
import { FileUp, ArrowLeft, Check, AlertCircle, X } from 'lucide-react';
import UploadRequestService from '../../../../utils/UploadRequestService';

const categories = [
  { value: 'educational', label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'news', label: 'News & Politics' },
  { value: 'technology', label: 'Technology' },
  { value: 'travel', label: 'Travel & Events' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

const NewUploadRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await UploadRequestService.create(formData);
      setCreatedId(result.id);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to create upload request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-elevated border border-elevated-border rounded-xl p-8 text-center shadow-md">
          <div className="w-16 h-16 rounded-full bg-green-500 text-white mx-auto flex items-center justify-center mb-5 ring-4 ring-green-500/30">
            <Check size={32} strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Upload Request Created!</h2>
          <p className="text-gray-300 mb-6">
            Your request has been saved as a draft. Review and submit it when ready.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={() => navigate(`/dashboard/upload-requests/${createdId}`)}
              className="bg-brand-600 hover:bg-brand-700 text-white focus:ring-0"
            >
              View Request
            </Button>
            <Button
              onClick={() => navigate('/dashboard/upload-requests')}
              className="border border-elevated-border bg-surface-600 text-gray-300 hover:bg-surface-500 focus:ring-0"
            >
              Back to Requests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/dashboard/upload-requests')}
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        type="button"
      >
        <ArrowLeft size={16} />
        Back to Upload Requests
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-brand-600/20">
          <FileUp size={20} className="text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">New Upload Request</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-900/20 border border-red-800/40">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-gray-500 hover:text-white shrink-0" type="button">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-elevated border border-elevated-border rounded-xl p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mb-2 block">
              <label htmlFor="title" className="text-sm font-medium text-white">
                Video Title <span className="text-red-400">*</span>
              </label>
            </div>
            <TextInput
              id="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter a title for your video"
              required
              maxLength={200}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <label htmlFor="description" className="text-sm font-medium text-white">
                Description
              </label>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your video content (optional)"
              rows={4}
              maxLength={5000}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <label htmlFor="category" className="text-sm font-medium text-white">
                Category
              </label>
            </div>
            <Select id="category" value={formData.category} onChange={handleChange}>
              <option value="">Select a category (optional)</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="pt-5 border-t border-elevated-border mt-5">
            <p className="text-xs text-gray-500 mb-4">
              After creating the request, you can review and submit it for admin approval.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => navigate('/dashboard/upload-requests')}
                className="border border-elevated-border bg-surface-600 text-gray-300 hover:bg-surface-500 focus:ring-0"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 focus:ring-0"
                isProcessing={loading}
                processingSpinner={<Spinner size="sm" />}
              >
                {loading ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewUploadRequest;
