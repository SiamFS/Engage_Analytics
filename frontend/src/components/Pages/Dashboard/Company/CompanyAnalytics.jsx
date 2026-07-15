import React, { useState, useEffect, useContext } from 'react';
import { Spinner, Card } from 'flowbite-react';
import { BarChart4, FileUp, CheckCircle, XCircle, Clock, Activity, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';
import UploadRequestService from '../../../../utils/UploadRequestService';

const STATUS_COLORS = {
  draft: '#6b7280',
  submitted: '#3b82f6',
  pending_review: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  processing: '#a855f7',
  completed: '#10b981',
  failed: '#ef4444',
  cancelled: '#6b7280',
  archived: '#4b5563',
};

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

const CompanyAnalytics = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await UploadRequestService.getCompanyAnalytics();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="text-brand-400 hover:text-brand-300 text-sm" type="button">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const chartData = Object.entries(STATUS_LABELS)
    .filter(([key]) => data[key] !== undefined && data[key] > 0)
    .map(([key, label]) => ({
      name: label,
      value: data[key],
      fill: STATUS_COLORS[key],
    }));

  const stats = [
    { label: 'Total Uploads', value: data.total_requests, icon: <FileUp size={20} />, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { label: 'Completed', value: data.completed, icon: <CheckCircle size={20} />, color: 'text-green-400', bg: 'bg-green-600/20' },
    { label: 'Pending Review', value: data.submitted + data.pending_review, icon: <Clock size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
    { label: 'Rejected', value: data.rejected, icon: <XCircle size={20} />, color: 'text-red-400', bg: 'bg-red-600/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-600/20">
            <BarChart4 size={20} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">My Analytics</h1>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 text-gray-400 hover:text-white hover:bg-surface-600 rounded-lg transition-colors"
          title="Refresh"
          type="button"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-elevated border-elevated-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-elevated border-elevated-border shadow-md">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Activity size={18} />
          Request Status Distribution
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No data available yet.</p>
        )}
      </Card>

      {data.total_frames > 0 && (
        <Card className="bg-elevated border-elevated-border shadow-md">
          <h3 className="text-lg font-medium text-white mb-2">Emotion Analysis</h3>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-medium">{data.total_frames.toLocaleString()}</span> emotion data points analyzed across your approved videos.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CompanyAnalytics;
