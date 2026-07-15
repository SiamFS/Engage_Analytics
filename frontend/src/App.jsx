import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavigationBar from './components/Shared/Navbar/Navbar';
import MainFooter from './components/Shared/Footer/Footer';
import ScrollToTop from './components/Shared/ScrollToTop/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';


const AUTH_ROUTES = ['/login', '/signup', '/forgetpassword'];

function App() {
  const location = useLocation();

  const isAuthPage = AUTH_ROUTES.includes(location.pathname);
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* navbar */}
      {!isAuthPage && <NavigationBar />}
      
      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Main content */}
      <main className={`${!isAuthPage ? 'pt-16' : ''}`}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      
      {/* footer */}
      {!isAuthPage && <MainFooter />}
    </div>
  );
}

export default App;