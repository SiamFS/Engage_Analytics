import React, { useState } from 'react';
import { ClipboardList, MessageSquareText, BarChart3 } from 'lucide-react';
import AdminSurveyBuilder from './AdminSurveyBuilder';
import AdminFeedbackManagement from './AdminFeedbackManagement';
import AdminFeedbackAnalytics from './AdminFeedbackAnalytics';

const TABS = [
  { key: 'builder', label: 'Survey Builder', icon: ClipboardList },
  { key: 'submissions', label: 'Submissions', icon: MessageSquareText },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const AdminSurveyManagement = () => {
  const [activeTab, setActiveTab] = useState('builder');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20">
            <ClipboardList size={22} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Survey Management</h1>
            <p className="text-gray-400 text-sm">Manage ad feedback questions, submissions, and analytics</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-600/50 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-surface-500'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'builder' && <AdminSurveyBuilder />}
      {activeTab === 'submissions' && <AdminFeedbackManagement />}
      {activeTab === 'analytics' && <AdminFeedbackAnalytics />}
    </div>
  );
};

export default AdminSurveyManagement;
