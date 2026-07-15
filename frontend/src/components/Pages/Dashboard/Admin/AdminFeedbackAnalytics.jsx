import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spinner } from 'flowbite-react';
import { BarChart3, Star, MessageSquareText, CheckCircle, TrendingUp } from 'lucide-react';
import FeedbackService from '../../../../utils/FeedbackService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

const AdminFeedbackAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await FeedbackService.adminGetFeedbackAnalytics();
      setData(res);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="xl" /></div>;
  if (!data) return <div className="text-center py-16 text-gray-500">No analytics available.</div>;

  const ratingDist = Object.entries(data.rating_distribution || {}).map(([star, count]) => ({
    name: `${star} Star`,
    stars: parseInt(star),
    count,
  }));

  const pieData = ratingDist.map(d => ({ name: d.name, value: d.count }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <MessageSquareText size={24} className="text-brand-400" />
            <div>
              <p className="text-gray-400 text-xs uppercase">Total Responses</p>
              <p className="text-white text-2xl font-bold">{data.total_responses}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <Star size={24} className="text-yellow-400" />
            <div>
              <p className="text-gray-400 text-xs uppercase">Avg Rating</p>
              <p className="text-white text-2xl font-bold">{data.average_rating}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-400" />
            <div>
              <p className="text-gray-400 text-xs uppercase">Completion Rate</p>
              <p className="text-white text-2xl font-bold">{data.completion_rate}%</p>
            </div>
          </div>
        </Card>
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-400" />
            <div>
              <p className="text-gray-400 text-xs uppercase">Consent Rate</p>
              <p className="text-white text-2xl font-bold">{data.consent_rate || 0}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-elevated border-elevated-border">
          <h3 className="text-white font-semibold mb-4">Rating Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ratingDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#f3f4f6' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {ratingDist.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-elevated border-elevated-border">
          <h3 className="text-white font-semibold mb-4">Rating Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {pieData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {data.recent_trend?.length > 0 && (
        <Card className="bg-elevated border-elevated-border">
          <h3 className="text-white font-semibold mb-4">Response Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[...data.recent_trend].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="avg_rating" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}


    </div>
  );
};

export default AdminFeedbackAnalytics;
