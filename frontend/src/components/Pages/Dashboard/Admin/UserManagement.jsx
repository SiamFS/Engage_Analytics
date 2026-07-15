import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Alert, Modal } from 'flowbite-react';
import {
  Users, Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import UploadRequestService from '../../../../utils/UploadRequestService';

const ROLE_LABELS = { admin: 'Admin', company: 'Company', user: 'Viewer' };
const ROLE_STYLES = {
  admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  company: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  user: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('-date_joined');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '', first_name: '', last_name: '', role: 'user', password: '', company_name: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await UploadRequestService.adminGetUsers({
        limit, offset, search: search || null, role: roleFilter, status: statusFilter || null, sort_by: sortBy,
      });
      setUsers(result.results || []);
      setTotal(result.total || 0);
      setSelectAll(false);
      setSelectedUsers([]);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [offset, search, roleFilter, statusFilter, sortBy]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleSelectAll = () => {
    if (selectAll) { setSelectedUsers([]); setSelectAll(false); }
    else { setSelectedUsers(users.map((u) => u.id)); setSelectAll(true); }
  };

  const handleSelect = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await UploadRequestService.adminCreateUser(formData);
      setShowCreateModal(false);
      setFormData({ email: '', first_name: '', last_name: '', role: 'user', password: '', company_name: '' });
      setSuccess('User created successfully');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setActionLoading(true);
    setError(null);
    try {
      await UploadRequestService.adminUpdateUser(editUser.id, formData);
      setShowEditModal(false);
      setEditUser(null);
      setSuccess('User updated successfully');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editUser) return;
    setActionLoading(true);
    setError(null);
    try {
      await UploadRequestService.adminDeleteUser(editUser.id);
      setShowDeleteModal(false);
      setEditUser(null);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        await UploadRequestService.adminDeactivateUser(user.id);
      } else {
        await UploadRequestService.adminActivateUser(user.id);
      }
      setSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await UploadRequestService.adminBulkAction(action, selectedUsers);
      setSuccess(result.message || `Action '${action}' completed`);
      setSelectedUsers([]);
      setSelectAll(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'user',
      password: '',
      company_name: user.company_name || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setEditUser(user);
    setShowDeleteModal(true);
  };

  const SortHeader = ({ field, label }) => {
    const isActive = sortBy === field || sortBy === `-${field}`;
    const isAsc = sortBy === field;
    return (
      <th
        className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-white select-none"
        onClick={() => setSortBy(isActive && !isAsc ? field : `-${field}`)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {isActive && (isAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-600/20">
            <Users size={20} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
        </div>
        <button
          onClick={() => { setFormData({ email: '', first_name: '', last_name: '', role: 'user', password: '', company_name: '' }); setShowCreateModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          type="button"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {error && <Alert color="failure" onDismiss={() => setError(null)} className="mb-4 rounded-lg border border-red-800/40">{error}</Alert>}
      {success && <Alert color="success" onDismiss={() => setSuccess(null)} className="mb-4 rounded-lg border border-green-800/40">{success}</Alert>}

      <div className="bg-elevated border border-elevated-border rounded-xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); } }}
                className="w-full pl-9 pr-3 py-2 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button onClick={() => setOffset(0)} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors" type="button">Search</button>
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setOffset(0); }}
            className="px-3 py-2 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="company">Company</option>
            <option value="user">Viewer</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            className="px-3 py-2 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-brand-600/10 border border-brand-600/20 rounded-lg">
            <span className="text-sm text-gray-300">{selectedUsers.length} selected</span>
            <button onClick={() => handleBulkAction('activate')} disabled={actionLoading}
              className="px-3 py-1 text-xs font-medium text-green-300 bg-green-600/20 hover:bg-green-600/30 rounded-lg transition-colors" type="button">Activate</button>
            <button onClick={() => handleBulkAction('deactivate')} disabled={actionLoading}
              className="px-3 py-1 text-xs font-medium text-yellow-300 bg-yellow-600/20 hover:bg-yellow-600/30 rounded-lg transition-colors" type="button">Deactivate</button>
            <button onClick={() => handleBulkAction('delete')} disabled={actionLoading}
              className="px-3 py-1 text-xs font-medium text-red-300 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors" type="button">Delete</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="xl" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-elevated-border">
                    <th className="px-5 py-3 w-10">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll}
                        className="rounded border-gray-600 bg-surface-600 text-brand-600 focus:ring-brand-500" />
                    </th>
                    <SortHeader field="first_name" label="Name" />
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                    <SortHeader field="role" label="Role" />
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Company</th>
                    <SortHeader field="is_active" label="Status" />
                    <SortHeader field="date_joined" label="Created" />
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-elevated-border">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-surface-600 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => handleSelect(u.id)}
                          className="rounded border-gray-600 bg-surface-600 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="px-5 py-3 text-white font-medium">{u.first_name} {u.last_name}</td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden lg:table-cell">{u.company_name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-600/20 text-green-300' : 'bg-gray-600/20 text-gray-400'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{new Date(u.date_joined).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditModal(u)} className="p-1.5 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 transition-colors" title="Edit" type="button">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleToggleActive(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30' : 'bg-green-600/20 text-green-300 hover:bg-green-600/30'}`} title={u.is_active ? 'Deactivate' : 'Activate'} type="button">
                            {u.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                          <button onClick={() => openDeleteModal(u)} className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors" title="Delete" type="button">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-elevated-border mt-4">
                <span className="text-sm text-gray-400">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
                <div className="flex gap-2">
                  <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
                    className="px-3 py-1.5 text-sm bg-surface-600 text-gray-300 rounded-lg hover:bg-surface-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" type="button">Previous</button>
                  <span className="px-3 py-1.5 text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))} disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-sm bg-surface-600 text-gray-300 rounded-lg hover:bg-surface-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" type="button">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)}
        theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Create User</span>
        </Modal.Header>
        <form onSubmit={handleCreate}>
          <Modal.Body className="bg-elevated text-white space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email <span className="text-red-400">*</span></label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">First Name</label>
                <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Last Name</label>
                <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
                <option value="user">Viewer</option>
                <option value="company">Company</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {formData.role === 'company' && (
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Company Name</label>
                <input type="text" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
            )}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password (optional - Firebase SSO users may not need one)</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" placeholder="Leave blank for Firebase auth users" />
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-elevated border-t border-elevated-border">
              <button type="submit" disabled={actionLoading || !formData.email}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Create User'}
            </button>
            <button onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">Cancel</button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={showEditModal} onClose={() => setShowEditModal(false)}
        theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Edit User</span>
        </Modal.Header>
        <form onSubmit={handleEdit}>
          <Modal.Body className="bg-elevated text-white space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">First Name</label>
                <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Last Name</label>
                <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
                <option value="user">Viewer</option>
                <option value="company">Company</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {formData.role === 'company' && (
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Company Name</label>
                <input type="text" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full p-2.5 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500" />
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-elevated border-t border-elevated-border">
              <button type="submit" disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
                {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">Cancel</button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)}
        theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Delete User</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-2">Are you sure you want to delete <span className="font-semibold">{editUser?.email}</span>?</p>
          <p className="text-red-400 text-sm">This action cannot be undone. The user will be removed from both the database and Firebase Auth.</p>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button onClick={handleDelete} disabled={actionLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50" type="button">
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </button>
          <button onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">Cancel</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManagement;
