import React, { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Menu, X, User } from "lucide-react";
import SearchBar from "../SearchBar/SearchBar";
import NotificationBell from "../NotificationBell/NotificationBell";

const NavigationBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => { setImageError(false); }, [user?.photoURL]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current &&
          !mobileMenuRef.current.contains(event.target) &&
          !event.target.closest('[data-mobile-toggle]')) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderNavLinks = (mobile = false) => {
    const baseClass = mobile
      ? "block px-3 py-2 rounded-md text-base font-medium"
      : "text-gray-300 hover:text-white transition-colors";
    const activeClass = mobile
      ? "text-white bg-surface-800"
      : "text-brand-400 hover:text-brand-300";
    const inactiveClass = mobile
      ? "text-gray-300 hover:text-white hover:bg-elevated-hover"
      : "text-gray-300 hover:text-white";
    const onClick = mobile ? () => setIsMobileMenuOpen(false) : undefined;

    return (
      <>
        <Link to="/" onClick={onClick} className={`${baseClass} ${activeClass}`}>Home</Link>
        <Link to="/about" onClick={onClick} className={`${baseClass} ${inactiveClass}`}>About</Link>
        <Link to="/videos" onClick={onClick} className={`${baseClass} ${inactiveClass}`}>Videos</Link>
      </>
    );
  };

  const renderUserMenu = () => {
    if (!showUserMenu) return null;
    return (
      <div className="absolute right-0 mt-2 w-48 py-2 bg-elevated border border-elevated-border rounded-xl shadow-elevated z-50">
        <div className="px-4 py-2 border-b border-elevated-border">
          <p className="text-sm font-semibold text-white">
            {user.firstName ? `${user.firstName} ${user.lastName}` : user.displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <Link to="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-elevated-hover hover:text-white transition-colors">Your Profile</Link>
        <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-300 hover:bg-elevated-hover hover:text-white transition-colors">Dashboard</Link>
        <Link to="/devices" className="block px-4 py-2 text-sm text-gray-300 hover:bg-elevated-hover hover:text-white transition-colors">Device Manager</Link>
        <div className="border-t border-elevated-border my-1" />
        <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-elevated-hover hover:text-white transition-colors" type="button">Sign out</button>
      </div>
    );
  };

  const renderUserControls = () => {
    if (!user) {
      return (
        <Link to="/login" className="btn-primary btn-md rounded-full" type="button">
          Login
        </Link>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <NotificationBell />
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center focus:outline-none"
            type="button"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-surface-500 hover:border-brand-500 transition-colors bg-surface-600 flex items-center justify-center">
              {imageError || !user.photoURL ? (
                <User size={16} className="text-gray-300" />
              ) : (
                <img src={user.photoURL} alt="User profile" className="h-full w-full object-cover" onError={() => setImageError(true)} loading="eager" />
              )}
            </div>
          </button>
          {renderUserMenu()}
        </div>
      </div>
    );
  };

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;
    return (
      <div ref={mobileMenuRef} className="md:hidden bg-elevated shadow-elevated transition-all duration-300">
        {user && (
          <div className="px-4 py-3"><SearchBar /></div>
        )}
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {renderNavLinks(true)}
        </div>
        {user && (
          <div className="pt-4 pb-3 border-t border-elevated-border">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-surface-600 flex items-center justify-center overflow-hidden">
                {imageError || !user.photoURL ? (
                  <User size={20} className="text-gray-300" />
                ) : (
                  <img className="h-full w-full object-cover" src={user.photoURL} alt="User avatar" onError={() => setImageError(true)} loading="eager" />
                )}
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-white">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.displayName}
                </div>
                <div className="text-sm font-medium text-gray-500 truncate max-w-[200px]">{user.email}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-elevated-hover">Your Profile</Link>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-elevated-hover">Dashboard</Link>
              <Link to="/devices" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-elevated-hover">Device Manager</Link>
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-elevated-hover" type="button">Sign out</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-surface/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-brand-600 rounded-lg shadow-md">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Engage Analytics</span>
          </Link>
          {user && (
            <div className="hidden md:block flex-1 max-w-md mx-10">
              <SearchBar />
            </div>
          )}
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex space-x-6 text-sm font-medium">
              {renderNavLinks()}
            </nav>
            {renderUserControls()}
            <button
              data-mobile-toggle
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
              aria-label="Toggle menu"
              type="button"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {renderMobileMenu()}
    </div>
  );
};

export default NavigationBar;
