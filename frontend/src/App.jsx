import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import NavigationBar from './components/Shared/Navbar/Navbar';
import MainFooter from './components/Shared/Footer/Footer';
import ScrollToTop from './components/Shared/ScrollToTop/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';

const AUTH_ROUTES = ['/login', '/signup', '/forgetpassword'];

function App() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

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
      </div>
    </MotionConfig>
  );
}

export default App;
