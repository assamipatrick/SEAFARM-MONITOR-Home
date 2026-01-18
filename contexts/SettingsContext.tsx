
import React, { createContext, useContext, useEffect } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the custom hook to manage settings state and persistence automatically
  const [settings, setSettings] = useLocalStorage<AppSettings>('appSettings', DEFAULT_SETTINGS);

  useEffect(() => {
      // Apply theme class to body for global styles whenever settings change
      document.body.className = '';
      
      const themeClasses = settings.theme.className.split(' ').filter(Boolean);
      // Removed default background classes to allow MainLayout to control the background image/overlay
      document.body.classList.add(...themeClasses, settings.theme.font);
  }, [settings]);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };
  
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
