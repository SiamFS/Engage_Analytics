import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import NotificationService from '../../../utils/NotificationService';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const initialLoadDone = useRef(false);

  const fetchCount = useCallback(async (forceRefresh = false) => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const count = await NotificationService.getUnreadCount(forceRefresh);
      if (initialLoadDone.current && count === undefined) return;
      setUnreadCount(count);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    fetchCount(true);
    const interval = setInterval(() => fetchCount(true), 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/dashboard/notifications');
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-300 hover:text-white hover:bg-surface-600/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px] min-h-[18px]">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={handleClose}
          onViewAll={handleViewAll}
          onCountUpdate={setUnreadCount}
        />
      )}
    </div>
  );
};

export default NotificationBell;
