
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout: React.FC = () => {
  const { settings } = useSettings();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`${settings.theme.className} ${settings.theme.font} min-h-screen flex transition-colors duration-500 relative bg-[url('https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed text-gray-800 dark:text-gray-200`}>
        {/* Overlay to ensure text readability while maintaining the theme */}
        <div className="absolute inset-0 bg-gray-100/80 dark:bg-black/70 backdrop-blur-sm z-0 pointer-events-none"></div>
        
        <div className="flex flex-1 z-10 relative h-full">
            {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}
            <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
              <Header onMenuClick={() => setSidebarOpen(p => !p)} />
              <main className="p-4 sm:p-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                <Outlet />
              </main>
            </div>
        </div>
      </div>
  );
};

export default MainLayout;
