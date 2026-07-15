import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import {
  Home,
  Upload,
  Menu,
  X,
  Video,
  User,
  Clock,
  ThumbsUp,
  BarChart3,
  UserCog,
  VideoIcon,
  Bell,
  Award,
  ClipboardList,
  FileUp,
  BarChart4,
  Users,
} from 'lucide-react';

const notificationItem = { path: '/dashboard/notifications', name: 'Notifications', icon: <Bell size={20} /> };

const getNavItems = (role) => {
  const baseItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <Home size={20} /> },
    notificationItem,
  ];
  const analyticsItem = { path: '/dashboard/detailed-analytics', name: 'Video Analytics', icon: <BarChart3 size={20} /> };

  if (role === 'admin') {
    baseItems.push(
      { path: '/dashboard/upload', name: 'Upload Video', icon: <Upload size={20} /> },
      { path: '/dashboard/admin-upload-requests', name: 'Upload Requests', icon: <FileUp size={20} /> },
      { path: '/dashboard/videos', name: 'Manage Videos', icon: <Video size={20} /> },
      { path: '/dashboard/company-management', name: 'User Management', icon: <Users size={20} /> },
      { path: '/dashboard/recorded-videos', name: 'Webcam Recordings', icon: <VideoIcon size={20} /> },
      { path: '/dashboard/points', name: 'Points', icon: <Award size={20} /> },
      { path: '/dashboard/survey', name: 'Survey Management', icon: <ClipboardList size={20} /> },
      analyticsItem,
    );
  } else if (role === 'company') {
    baseItems.push(
      { path: '/dashboard/upload', name: 'Upload Video', icon: <Upload size={20} /> },
      { path: '/dashboard/upload-requests', name: 'Upload Requests', icon: <FileUp size={20} /> },
      { path: '/dashboard/company-analytics', name: 'My Analytics', icon: <BarChart4 size={20} /> },
      analyticsItem,
    );
  } else if (role === 'user') {
    baseItems.push(
      { path: '/dashboard/history', name: 'Watch History', icon: <Clock size={20} /> },
      { path: '/dashboard/liked-videos', name: 'Liked Videos', icon: <ThumbsUp size={20} /> },
      { path: '/dashboard/my-feedback', name: 'My Feedback', icon: <MessageSquareText size={20} /> },
      analyticsItem,
    );
  }
  return baseItems;
};

const navItemBaseClasses = "flex items-center rounded-lg p-2 text-gray-300 hover:bg-elevated-hover group transition-all duration-200";
const navItemActiveClasses = "bg-brand-600 text-white hover:bg-brand-700";

const DashboardSideNavbar = ({ isOpen, setIsOpen, isHovering, setIsHovering }) => {
  const { user } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user?.photoURL) setImageError(false);
  }, [user?.photoURL]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSidebarClass = () => {
    if (isMobile) {
      return `fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-surface border-r border-elevated-border transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`;
    }
    const desktopShift = isHovering || isOpen ? 'translate-x-0' : '-translate-x-44';
    return `fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-surface border-r border-elevated-border transition-transform duration-300 ${desktopShift}`;
  };

  const handleMouseEnter = () => {
    if (!isOpen && !isMobile) setIsHovering(true);
  };

  const handleMouseLeave = () => setIsHovering(false);

  const renderNavItems = () => {
    const navItems = getNavItems(user?.role || 'user');
    return (
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) => {
                const activeClass = isActive ? navItemActiveClasses : '';
                const justifyClass = !isOpen && !isHovering && !isMobile ? 'justify-end pr-5' : 'justify-start';
                return `${navItemBaseClasses} ${activeClass} ${justifyClass} mb-1`;
              }}
            >
              {item.icon}
              {(isOpen || isHovering) && (
                <span className="ml-3 text-sm">{item.name}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    );
  };

  const renderUserProfile = () => {
    const collapsed = !isOpen && !isHovering && !isMobile;
    const containerClass = collapsed ? 'flex justify-end pr-2' : 'px-2';
    const profileClass = collapsed ? 'flex-col items-center' : 'items-center space-x-3';
    const avatarSizeClass = collapsed ? 'w-10 h-10' : 'w-8 h-8';

    return (
      <div className={`mb-6 ${containerClass}`}>
        <div className={`flex ${profileClass}`}>
          {imageError || !user?.photoURL ? (
            <div className={`${avatarSizeClass} rounded-full bg-surface-600 flex items-center justify-center border-2 border-brand-600/50 shrink-0`}>
              <User size={collapsed ? 20 : 16} className="text-gray-300" />
            </div>
          ) : (
            <img
              src={user?.photoURL}
              alt={`${user?.displayName || 'User'}'s avatar`}
              className={`${avatarSizeClass} rounded-full object-cover border-2 border-brand-600/50 shrink-0`}
              onError={(e) => { e.target.onerror = null; setImageError(true); }}
            />
          )}
          {(isOpen || isHovering) && (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[160px]">
                {user?.email || 'user@example.com'}
              </p>
              {user?.role && (
                <p className="text-xs text-brand-400 font-medium capitalize">
                  {user.role}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <nav
        className={getSidebarClass()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-full flex flex-col justify-between py-4 px-3">
          {renderUserProfile()}
          <div className="flex-grow">
            {renderNavItems()}
          </div>
        </div>
      </nav>

      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-brand-600 text-white shadow-lg md:hidden"
          type="button"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(false); }}
        />
      )}
    </>
  );
};

DashboardSideNavbar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  isHovering: PropTypes.bool,
  setIsHovering: PropTypes.func
};

DashboardSideNavbar.defaultProps = {
  isHovering: false,
  setIsHovering: () => {}
};

export default DashboardSideNavbar;
