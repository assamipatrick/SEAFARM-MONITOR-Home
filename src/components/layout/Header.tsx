

import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { THEMES } from '../../constants';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import NotificationBell from '../NotificationBell';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import QRScannerModal from '../QRScannerModal';
import TraceabilityModal from '../TraceabilityModal';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { settings, updateSettings } = useSettings();
  const { t } = useLocalization();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState<{ type: 'module' | 'batch', id: string } | null>(null);
  const [isTraceabilityOpen, setIsTraceabilityOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isDarkMode = settings.theme.className.includes('dark');

  useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const toggleTheme = () => {
    const isGlass = settings.theme.id.includes('glass');
    let newThemeId: string;

    if (isDarkMode) {
      newThemeId = isGlass ? 'light-glass' : 'light-formal';
    } else {
      newThemeId = isGlass ? 'dark-glass' : 'dark-formal';
    }
    
    const newTheme = THEMES.find(t => t.id === newThemeId);
    if (newTheme) {
      updateSettings({ ...settings, theme: newTheme });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleScan = (dataString: string) => {
      setIsScannerOpen(false);
      try {
          const data = JSON.parse(dataString);
          if (data.t && data.id) {
              const type = data.t === 'm' ? 'module' : 'batch';
              setTraceabilityData({ type, id: data.id });
              setIsTraceabilityOpen(true);
          } else {
              alert(t('invalidQRCode'));
          }
      } catch (e) {
          alert(t('invalidQRCode'));
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
    <header className="bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-sm p-2 sm:p-4 flex items-center justify-between sticky top-0 z-40 border-b border-white/20 dark:border-gray-700/50">
      <div className="flex items-center min-w-0"> {/* Use min-w-0 to allow truncation in flexbox */}
        <button onClick={onMenuClick} className="p-2 -ml-2 mr-2 rounded-md text-gray-600 dark:text-gray-300 md:hidden hover:bg-gray-200 dark:hover:bg-gray-700">
            <Icon name="Menu" className="w-6 h-6" />
        </button>
        <img src={settings.company.logoUrl} alt="Company Logo" className="h-8 sm:h-10 mr-3 sm:mr-4 flex-shrink-0" />
        <h1 className="hidden sm:block text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{settings.company.name}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Offline Indicator */}
        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-100/80 text-green-800' : 'bg-red-100/80 text-red-800'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
        </div>

        <Button variant="secondary" onClick={() => setIsScannerOpen(true)} className="hidden sm:flex !py-1.5 !px-3">
            <Icon name="QrCode" className="w-5 h-5 mr-1" />
            {t('scan')}
        </Button>
        <Button variant="ghost" onClick={() => setIsScannerOpen(true)} className="sm:hidden p-2 !rounded-full">
            <Icon name="QrCode" className="w-6 h-6" />
        </Button>
        
        <NotificationBell />
        <Button variant="ghost" onClick={toggleTheme} className="p-2 !rounded-full" aria-label={t('toggleTheme')}>
          <Icon name={isDarkMode ? 'Sun' : 'Moon'} className="w-6 h-6" />
        </Button>
        {currentUser && (
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors">
              <span className="font-semibold hidden sm:inline text-gray-700 dark:text-gray-200">{currentUser.firstName} {currentUser.lastName}</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
              </div>
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-xl z-50 p-1">
                 <button onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                  <Icon name="User" className="w-4 h-4" />
                  {t('profile')}
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                  <Icon name="LogOut" className="w-4 h-4" />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
    <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
    <TraceabilityModal isOpen={isTraceabilityOpen} onClose={() => setIsTraceabilityOpen(false)} scannedData={traceabilityData} />
    </>
  );
};

export default Header;