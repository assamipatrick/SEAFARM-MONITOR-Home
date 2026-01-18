import React, { createContext, useContext, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import { translations } from '../utils/translations';
import type { Language } from '../types';

type TranslationKey = keyof typeof translations;

interface LocalizationContextType {
  language: Language;
  t: (key: TranslationKey | string) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const language = settings.language;

  const t = useCallback((key: TranslationKey | string): string => {
    // @ts-ignore
    return translations[key] ? translations[key][language] : key;
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
