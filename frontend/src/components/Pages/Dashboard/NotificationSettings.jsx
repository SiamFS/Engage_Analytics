import { useState, useEffect, useRef } from 'react';
import { Bell, Save, Mail, Smartphone, Shield, Info, AlertCircle, Loader2 } from 'lucide-react';
import NotificationService from '../../../utils/NotificationService';

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadPreferences();
    return () => { mountedRef.current = false; };
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await NotificationService.getPreferences();
      if (mountedRef.current) setPreferences(data);
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Failed to load preferences');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleToggle = (field) => {
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleDigestChange = (e) => {
    setPreferences((prev) => ({ ...prev, digest_frequency: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await NotificationService.updatePreferences(preferences);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-6 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="text-red-300">{error}</p>
          <button
            onClick={loadPreferences}
              className="mt-4 px-4 py-2 bg-surface-600 text-gray-200 rounded-lg hover:bg-surface-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const settings = [
    {
      id: 'in_app_notifications',
      icon: Bell,
      title: 'In-App Notifications',
      description: 'Receive notifications within the application.',
      color: 'blue',
    },
    {
      id: 'email_notifications',
      icon: Mail,
      title: 'Email Notifications',
      description: 'Receive email notifications for important updates.',
      color: 'purple',
    },
    {
      id: 'push_notifications',
      icon: Smartphone,
      title: 'Push Notifications',
      description: 'Receive push notifications on your device.',
      color: 'green',
    },
    {
      id: 'security_notifications',
      icon: Shield,
      title: 'Security Notifications',
      description: 'Get notified about security-related events (password changes, new devices).',
      color: 'red',
    },
    {
      id: 'marketing_notifications',
      icon: Info,
      title: 'Marketing Notifications',
      description: 'Receive updates about new features and promotions.',
      color: 'yellow',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={24} className="text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-900/20 border border-green-800/40 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-300">Preferences saved successfully.</p>
        </div>
      )}

      <div className="bg-elevated rounded-xl border border-elevated-border shadow-md">
        <div className="p-5 border-b border-elevated-border">
          <h2 className="text-lg font-medium text-white">Notification Channels</h2>
          <p className="text-sm text-gray-400 mt-1">Choose how you receive notifications.</p>
        </div>

        <div className="divide-y divide-elevated-border">
          {settings.map((setting) => {
            const Icon = setting.icon;
            const isEnabled = preferences?.[setting.id];
            return (
              <div key={setting.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  setting.color === 'blue' ? 'bg-blue-500/10' :
                  setting.color === 'purple' ? 'bg-purple-500/10' :
                  setting.color === 'green' ? 'bg-green-500/10' :
                  setting.color === 'red' ? 'bg-red-500/10' :
                  setting.color === 'yellow' ? 'bg-yellow-500/10' : 'bg-gray-500/10'
                }`}>
                    <Icon size={18} className={`${
                      setting.color === 'blue' ? 'text-blue-400' :
                      setting.color === 'purple' ? 'text-purple-400' :
                      setting.color === 'green' ? 'text-green-400' :
                      setting.color === 'red' ? 'text-red-400' :
                      setting.color === 'yellow' ? 'text-yellow-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{setting.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(setting.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isEnabled ? 'bg-brand-600' : 'bg-surface-500'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={setting.title}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-elevated-border">
          <h2 className="text-lg font-medium text-white mb-3">Digest Frequency</h2>
          <div className="flex items-center gap-4">
            {['instant', 'daily', 'weekly'].map((freq) => (
              <label
                key={freq}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                  preferences?.digest_frequency === freq
                     ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300'
                    : 'bg-surface-600 border border-surface-500/30 text-gray-300 hover:bg-surface-500'
                }`}
              >
                <input
                  type="radio"
                  name="digest_frequency"
                  value={freq}
                  checked={preferences?.digest_frequency === freq}
                  onChange={handleDigestChange}
                  className="sr-only"
                />
                <span className="text-sm capitalize">{freq}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Instant sends notifications as they happen. Daily/Weekly sends a summary.
          </p>
        </div>

        {preferences?.digest_frequency !== 'instant' && (
          <div className="px-5 pb-5">
            <h2 className="text-lg font-medium text-white mb-3">Quiet Hours</h2>
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Start</label>
                <input
                  type="time"
                  value={preferences?.quiet_hours_start || ''}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, quiet_hours_start: e.target.value || null }))
                  }
                  className="bg-surface-600 text-gray-200 border border-surface-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
                />
              </div>
              <span className="text-gray-500 mt-6">to</span>
              <div>
                <label className="text-xs text-gray-400 block mb-1">End</label>
                <input
                  type="time"
                  value={preferences?.quiet_hours_end || ''}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, quiet_hours_end: e.target.value || null }))
                  }
                  className="bg-surface-600 text-gray-200 border border-surface-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Notifications will be muted during quiet hours (for daily/weekly digests).
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
