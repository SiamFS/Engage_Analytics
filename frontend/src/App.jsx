import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import NavigationBar from './components/Shared/Navbar/Navbar';
import MainFooter from './components/Shared/Footer/Footer';
import ScrollToTop from './components/Shared/ScrollToTop/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import SessionTimeoutHandler from './components/common/SessionTimeoutHandler/SessionTimeoutHandler';
import ActivityTracker from './components/common/ActivityTracker/ActivityTracker';

const AUTH_ROUTES = ['/login', '/signup', '/forgetpassword'];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  useEffect(() => {
    const handleAuthError = () => {
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth_error', handleAuthError);
    return () => window.removeEventListener('auth_error', handleAuthError);
  }, [navigate]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-surface text-gray-200">
        {!isAuthPage && <NavigationBar />}
        <ScrollToTop />
        <main className={`flex-1 ${!isAuthPage ? 'pt-16' : ''}`}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        {!isAuthPage && <MainFooter />}
        <SessionTimeoutHandler />
        <ActivityTracker />
      </div>
    </MotionConfig>
  );
}

export default App;
