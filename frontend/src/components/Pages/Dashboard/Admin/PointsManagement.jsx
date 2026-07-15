import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spinner } from 'flowbite-react';
import { DollarSign, Award, Users, TrendingUp, ArrowLeft, ArrowRight } from 'lucide-react';
import ApiService from '../../../../utils/ApiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const POINTS_PER_PAGE = 10;
const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const PointsManagement = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);

  const fetchPoints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const limit = POINTS_PER_PAGE;
      const offset = page * POINTS_PER_PAGE;
      const res = await ApiService.get(`admin/points/?limit=${limit}&offset=${offset}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load points data.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const totalPages = data ? Math.ceil(data.total / POINTS_PER_PAGE) : 0;

  const chartData = data?.profiles?.map((p, i) => ({
    name: p.user.email.split('@')[0],
    email: p.user.email,
    points: p.points,
  })) || [];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400">{error}</p>
        <button onClick={fetchPoints} className="mt-4 text-brand-400 hover:text-brand-300">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Points Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <Award className="text-yellow-400" size={28} />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Total Points Issued</p>
              <p className="text-white text-2xl font-bold">{data?.total_points?.toLocaleString() || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <DollarSign className="text-green-400" size={28} />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Total Value (BDT)</p>
              <p className="text-white text-2xl font-bold">{data?.total_points_value?.toLocaleString() || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <Users className="text-blue-400" size={28} />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Users With Points</p>
              <p className="text-white text-2xl font-bold">{data?.total_users || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-elevated border-elevated-border">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-purple-400" size={28} />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide">Deposit Required</p>
              <p className="text-green-400 text-2xl font-bold">{data?.total_points_value?.toLocaleString() || 0} BDT</p>
            </div>
          </div>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="bg-elevated border-elevated-border">
          <h3 className="text-white font-semibold mb-4">Points per User</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value, name, props) => [`${value} pts`, props.payload.email]}
              />
              <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.email} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="bg-elevated border-elevated-border">
        <h3 className="text-white font-semibold mb-4">All Users — Points Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-surface-500">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4 text-right">Points</th>
                <th className="pb-3 pr-4 text-right">Earned</th>
                <th className="pb-3 pr-4 text-right">Redeemed</th>
                <th className="pb-3 text-right">Value (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {data?.profiles?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="pt-6 text-center text-gray-500">No users with points found.</td>
                </tr>
              ) : (
                data?.profiles?.map((profile) => (
                  <tr key={profile.user.email} className="border-b border-surface-500/50 hover:bg-surface-500/30">
                    <td className="py-3 pr-4 text-white">
                      {profile.user.first_name || profile.user.last_name
                        ? `${profile.user.first_name} ${profile.user.last_name}`.trim()
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-300 text-xs">{profile.user.email}</td>
                    <td className="py-3 pr-4 text-right text-yellow-400 font-medium">{profile.points}</td>
                    <td className="py-3 pr-4 text-right text-green-400">{profile.points_earned}</td>
                    <td className="py-3 pr-4 text-right text-red-400">{profile.points_redeemed}</td>
                    <td className="py-3 text-right text-gray-300">{profile.points_value} BDT</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-500">
            <p className="text-gray-400 text-sm">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <ArrowLeft size={14} /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PointsManagement;
