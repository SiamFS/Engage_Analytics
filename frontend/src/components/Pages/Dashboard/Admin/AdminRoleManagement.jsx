import React, { useState, useEffect, useRef } from 'react';
import { TextInput, Spinner, Alert, Modal } from 'flowbite-react';
import { Search, UserPlus, UserCog, Shield, Mail, Calendar } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';

const AdminRoleManagement = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setSearchResults(null);

      const response = await VideoService.adminSearchUser(searchEmail);
      
      if (isMounted.current) {
        setSearchResults(response);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (isMounted.current) {
        setError(err.message || 'User not found');
      }
    } finally {
      if (isMounted.current) { setLoading(false); }
    }
  };

  const openPromoteModal = (userId) => {
    setSelectedUserId(userId);
    setConfirmModalOpen(true);
  };

  const handlePromoteUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await VideoService.adminPromoteToAdmin(selectedUserId);
      
      if (isMounted.current) {
        setSuccess(response.message || 'User successfully promoted to admin');
        setSearchResults(response.user);
        setConfirmModalOpen(false);
      }
    } catch (err) {
      console.error('Promotion error:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to promote user.');
      }
    } finally {
      if (isMounted.current) { setLoading(false); }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-purple-600/20">
          <UserCog size={20} className="text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">User Role Management</h1>
      </div>
      
      <div className="bg-elevated rounded-xl border border-elevated-border p-5 shadow-md">
        <h2 className="text-base font-semibold text-white mb-5">Find User</h2>
        
        {error && (
          <Alert color="failure" onDismiss={() => setError(null)} className="mb-4 rounded-lg border border-red-800/40">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert color="success" onDismiss={() => setSuccess(null)} className="mb-4 rounded-lg border border-green-800/40">
            {success}
          </Alert>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <TextInput
            id="email-search"
            type="email"
            placeholder="Search user by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition-colors disabled:opacity-50"
            type="button"
          >
            {loading ? <Spinner size="sm" /> : <Search size={16} />}
            Search
          </button>
        </div>
        
        {searchResults && (
          <div className="mt-5 bg-surface-600 rounded-xl border border-elevated-border p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Shield size={16} className="text-purple-400" />
              Search Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-600 flex items-center justify-center shrink-0">
                  <UserCog size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Name</p>
                  <p className="text-white text-sm font-medium">{searchResults.first_name} {searchResults.last_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-500/50 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Email</p>
                  <p className="text-white text-sm truncate">{searchResults.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-500/50 flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Current Role</p>
                  <p className="text-white text-sm font-medium capitalize">{searchResults.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-500/50 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Member Since</p>
                  <p className="text-white text-sm">{new Date(searchResults.date_joined).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            {searchResults.role !== 'admin' && (
              <button
                onClick={() => openPromoteModal(searchResults.id)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg transition-all duration-200 disabled:opacity-50"
                type="button"
              >
                <UserPlus size={16} />
                Promote to Admin
              </button>
            )}
            {searchResults.role === 'admin' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-300 bg-green-600/20 rounded-lg">
                <Shield size={16} />
                Already Admin
              </div>
            )}
          </div>
        )}
      </div>
      
      <Modal show={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Confirm Promotion</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-4">Are you sure you want to promote this user to admin?</p>
          <div className="p-3 rounded-lg bg-amber-600/20 border border-amber-600/30 text-amber-300 text-sm">
            This will give the user full administrative access to the platform.
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button onClick={handlePromoteUser} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg transition-colors disabled:opacity-50" type="button">
            {loading && <Spinner size="sm" className="mr-2 inline" />}
            Confirm Promotion
          </button>
          <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRoleManagement;
