import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardSideNavbar from '../DashboardSideNavbar/DashboardSideNavbar';
import NavigationBar from '../../Shared/Navbar/Navbar';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50">
        <NavigationBar />
      </div>

      <DashboardSideNavbar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isHovering={isHovering}
        setIsHovering={setIsHovering}
      />

      <div
        className={`flex-1 transition-all duration-300 overflow-hidden ${
          isSidebarOpen || isHovering ? 'md:ml-64' : 'md:ml-20'
        }`}
        style={{ marginTop: '64px' }}
      >
        <div className="h-full overflow-y-auto scrollbar-custom">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
