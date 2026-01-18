import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Icon from './ui/Icon';

const NotificationBell: React.FC = () => {
  const { notifications } = useNotifications();
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
        case 'MODULE_UNASSIGNED': return <Icon name="Grid" className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
        case 'HARVEST_NEARING': return <Icon name="AlertTriangle" className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
        case 'HARVEST_OVERDUE': return <Icon name="AlertTriangle" className="w-5 h-5 text-red-500 flex-shrink-0" />;
        default: return <Icon name="Bell" className="w-5 h-5 text-gray-500 flex-shrink-0" />;
    }
  };
  
  const formatMessage = (key: string, params: Record<string, string | number>): string => {
    let message = t(key as any);
    for (const paramKey in params) {
        message = message.replace(`{${paramKey}}`, String(params[paramKey]));
    }
    return message;
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        aria-label={t('notifications_count').replace('{count}', String(notifications.length))}
      >
        <Icon name="Bell" className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">
              {notifications.length}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-xs sm:max-w-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-2xl z-50">
          <div className="p-3 font-semibold border-b border-gray-200 dark:border-gray-700">{t('notifications')}</div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <li key={notif.id}>
                  <Link
                    to={notif.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  >
                    {getIconForType(notif.type)}
                    <div className="flex-1">
                      <p className="text-sm">{formatMessage(notif.messageKey, notif.messageParams)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(notif.date).toLocaleDateString()}</p>
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{t('noNotifications')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
