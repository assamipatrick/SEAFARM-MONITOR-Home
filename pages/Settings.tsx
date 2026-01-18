
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useSettings } from '../contexts/SettingsContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import type { AppSettings, Denomination, CoordinateFormat } from '../types';
import { Language } from '../types';
import { THEMES, COUNTRIES } from '../constants';
import Icon from '../components/ui/Icon';
import Checkbox from '../components/ui/Checkbox';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { formatCurrency, parseNumber } from '../utils/formatters';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useLocalization();
  const { clearAllData } = useData();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [errors, setErrors] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  const validate = useCallback((data: AppSettings): Record<string, any> => {
    const newErrors: Record<string, any> = {};
    const { company, localization } = data;

    // Company validation
    if (!company.name.trim()) newErrors.companyName = t('validationRequired');
    if (!company.phone.trim()) newErrors.companyPhone = t('validationRequired');
    if (!company.nif.trim()) newErrors.companyNif = t('validationRequired');
    if (!company.rc.trim()) newErrors.companyRc = t('validationRequired');
    if (!company.stat.trim()) newErrors.companyStat = t('validationRequired');
    
    if (!company.email.trim()) {
        newErrors.companyEmail = t('validationRequired');
    } else if (!/\S+@\S+\.\S+/.test(company.email)) {
        newErrors.companyEmail = t('validationEmail');
    }
    
    if (isNaN(company.capital) || company.capital <= 0) {
      newErrors.companyCapital = t('validationPositiveNumber');
    }

    // Localization validation
    if (isNaN(localization.monetaryDecimals) || localization.monetaryDecimals < 0) {
      newErrors.monetaryDecimals = t('validationNonNegative');
    }
    if (isNaN(localization.nonMonetaryDecimals) || localization.nonMonetaryDecimals < 0) {
      newErrors.nonMonetaryDecimals = t('validationNonNegative');
    }
    
    return newErrors;
  }, [t]);

  useEffect(() => {
    const validationErrors = validate(localSettings);
    setErrors(validationErrors);
  }, [localSettings, validate]);

  const handleInputChange = (section: keyof AppSettings, field: any, value: any) => {
    setLocalSettings(prev => {
      const newSettings = {
        ...prev,
        [section]: {
          // @ts-ignore
          ...prev[section],
          [field]: value
        }
      };

      // Instant updates for certain fields or explicitly on Save
      if (
        (section === 'localization' && (field === 'thousandsSeparator' || field === 'decimalSeparator' || field === 'monetaryDecimals' || field === 'nonMonetaryDecimals' || field === 'coordinateFormat')) ||
        (section === 'company' && field === 'capital')
      ) {
        updateSettings(newSettings);
      }
      
      return newSettings;
    });
  };
  
  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setLocalSettings(prev => {
        const newSettings = {
          ...prev,
          localization: {
              ...prev.localization,
              country: country.code,
              currency: country.currency,
              currencySymbol: country.symbol,
              thousandsSeparator: country.thousandsSeparator,
              decimalSeparator: country.decimalSeparator,
              denominations: country.denominations.map(d => ({ id: `d-${d.value}-${d.type}`, ...d })),
          }
        };
        updateSettings(newSettings);
        return newSettings;
      });
    }
  };

  const handleSave = () => {
    if (Object.keys(errors).length === 0) {
      updateSettings(localSettings);
      alert(t('configurationSaved'));
    }
  };

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const standardDenominations = useMemo(() => {
      const country = COUNTRIES.find(c => c.code === localSettings.localization.country);
      return country?.denominations || [];
  }, [localSettings.localization.country]);

  const handleDenominationToggle = (value: number, type: 'coin' | 'banknote', checked: boolean) => {
      let newDenominations = [...localSettings.localization.denominations];
      if (checked) {
          // Add if it doesn't exist
          if (!newDenominations.some(d => d.value === value && d.type === type)) {
              newDenominations.push({ id: `d-${value}-${type}`, value, type });
          }
      } else {
          // Remove
          newDenominations = newDenominations.filter(d => !(d.value === value && d.type === type));
      }
      newDenominations.sort((a, b) => a.value - b.value);
      handleInputChange('localization', 'denominations', newDenominations);
  };

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('company', 'logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    handleInputChange('company', 'logoUrl', '');
  };
  
  const handleResetData = () => {
      clearAllData();
      alert(t('dataResetSuccess'));
      setIsResetConfirmOpen(false);
  };

  const isFormInvalid = Object.keys(errors).length > 0;

  return (
    <div className="pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('settingsTitle')}</h1>
        <Button onClick={handleSave} disabled={isFormInvalid}>{t('saveConfiguration')}</Button>
      </div>
      <div className="space-y-6">
        <Card title={t('companySection')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column - Details */}
            <div className="space-y-4">
                <Input 
                    label={t('companyName')} 
                    value={localSettings.company.name} 
                    onChange={e => handleInputChange('company', 'name', e.target.value)} 
                    error={errors.companyName} 
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label={t('email')} 
                        type="email" 
                        value={localSettings.company.email} 
                        onChange={e => handleInputChange('company', 'email', e.target.value)} 
                        error={errors.companyEmail} 
                    />
                     <Input 
                        label={t('phone')} 
                        value={localSettings.company.phone} 
                        onChange={e => handleInputChange('company', 'phone', e.target.value)} 
                        error={errors.companyPhone} 
                    />
                </div>
                 <Input 
                  label={t('address')} 
                  value={localSettings.company.address} 
                  onChange={e => handleInputChange('company', 'address', e.target.value)} 
                />
                <Input 
                  label={t('capital')} 
                  type="text" 
                  value={formatCurrency(localSettings.company.capital, localSettings.localization)} 
                  onChange={e => handleInputChange('company', 'capital', parseNumber(e.target.value, localSettings.localization))}
                  error={errors.companyCapital} 
                />
            </div>

            {/* Right Column - Identifiers & Logo */}
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">Legal Identifiers</h4>
                    <div className="grid grid-cols-1 gap-3">
                        <Input label={t('nif')} value={localSettings.company.nif} onChange={e => handleInputChange('company', 'nif', e.target.value)} error={errors.companyNif} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label={t('rc')} value={localSettings.company.rc} onChange={e => handleInputChange('company', 'rc', e.target.value)} error={errors.companyRc} />
                            <Input label={t('stat')} value={localSettings.company.stat} onChange={e => handleInputChange('company', 'stat', e.target.value)} error={errors.companyStat} />
                        </div>
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('logo')}</label>
                  <div className="flex items-center gap-4 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                    <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-md flex items-center justify-center border shadow-sm overflow-hidden">
                      {localSettings.company.logoUrl ? (
                        <img src={localSettings.company.logoUrl} alt={t('logoPreview')} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Icon name="Image" className="w-10 h-10 text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="secondary" onClick={handleLogoUploadClick} className="text-sm">
                        <Icon name="Image" className="w-4 h-4 mr-2"/>
                        {t('changeLogo')}
                      </Button>
                      {localSettings.company.logoUrl && (
                          <Button type="button" variant="ghost" onClick={handleRemoveLogo} className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Icon name="Trash2" className="w-4 h-4 mr-2"/>
                            {t('removeLogo')}
                          </Button>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/svg+xml"
                      />
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </Card>
        
        <Card title={t('localizationSection')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label={t('country')} value={localSettings.localization.country} onChange={e => handleCountryChange(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
            <Input label={t('currencyFormat')} value={`${localSettings.localization.currency} (${localSettings.localization.currencySymbol})`} disabled />
             <Select 
                label={t('coordinateFormat')} 
                value={localSettings.localization.coordinateFormat} 
                onChange={e => handleInputChange('localization', 'coordinateFormat', e.target.value)}
            >
                <option value="DMS">{t('coordinateFormat_DMS')}</option>
                <option value="DD">{t('coordinateFormat_DD')}</option>
            </Select>
            
            <Select label={t('thousandsSeparator')} value={localSettings.localization.thousandsSeparator} onChange={e => handleInputChange('localization', 'thousandsSeparator', e.target.value)}>
                <option value=",">{t('separator_comma')}</option>
                <option value=".">{t('separator_dot')}</option>
                <option value=" ">{t('separator_space')}</option>
            </Select>
             <Select label={t('decimalSeparator')} value={localSettings.localization.decimalSeparator} onChange={e => handleInputChange('localization', 'decimalSeparator', e.target.value)}>
                <option value=".">{t('separator_dot')}</option>
                <option value=",">{t('separator_comma')}</option>
            </Select>
            <Input label={t('monetaryDecimals')} type="number" value={localSettings.localization.monetaryDecimals} onChange={e => handleInputChange('localization', 'monetaryDecimals', parseInt(e.target.value))} error={errors.monetaryDecimals} />
          </div>
        </Card>

        <Card title={t('denominationsSection')}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('denominationsDescriptionNew')}</p>
          {standardDenominations.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide">{t('coins')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {standardDenominations.filter(d => d.type === 'coin').map(denom => (
                    <label key={`${denom.type}-${denom.value}`} className="flex items-center p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <Checkbox
                        checked={localSettings.localization.denominations.some(d => d.value === denom.value && d.type === denom.type)}
                        onChange={e => handleDenominationToggle(denom.value, denom.type, e.target.checked)}
                      />
                      <span className="ml-2 font-medium text-sm">{formatCurrency(denom.value, localSettings.localization)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide">{t('banknotes')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {standardDenominations.filter(d => d.type === 'banknote').map(denom => (
                    <label key={`${denom.type}-${denom.value}`} className="flex items-center p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <Checkbox
                        checked={localSettings.localization.denominations.some(d => d.value === denom.value && d.type === denom.type)}
                        onChange={e => handleDenominationToggle(denom.value, denom.type, e.target.checked)}
                      />
                      <span className="ml-2 font-medium text-sm">{formatCurrency(denom.value, localSettings.localization)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">{t('noDenominationsForCountry')}</p>
          )}
        </Card>
        
        <Card title={t('interfaceSection')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Select label={t('language')} value={localSettings.language} onChange={e => {
                const newLang = e.target.value as Language;
                updateSettings({ ...localSettings, language: newLang });
             }}>
                <option value={Language.EN}>{t('language_en')}</option>
                <option value={Language.FR}>{t('language_fr')}</option>
             </Select>
             <Select label={t('visualAppearance')} value={localSettings.theme.id} onChange={e => {
                 const newTheme = THEMES.find(th => th.id === e.target.value);
                 if (newTheme) {
                    updateSettings({ ...localSettings, theme: newTheme });
                 }
             }}>
                 {THEMES.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
             </Select>
          </div>
        </Card>

        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">{t('dataManagementSection')}</h3>
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">{t('resetData')}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {t('resetDataWarning')}
                    </p>
                </div>
                <Button variant="danger" onClick={() => setIsResetConfirmOpen(true)} className="ml-4">
                    <Icon name="Trash2" className="w-4 h-4 mr-2" />
                    {t('resetData')}
                </Button>
            </div>
        </div>

         {isResetConfirmOpen && (
            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleResetData}
                title={t('confirmDeleteTitle')}
                message={t('confirmResetData')}
                confirmText={t('delete')}
            />
        )}
      </div>
    </div>
  );
};

export default Settings;
