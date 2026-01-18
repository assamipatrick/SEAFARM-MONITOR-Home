import React from 'react';
import Card from '../components/ui/Card';
import { useLocalization } from '../contexts/LocalizationContext';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const { t } = useLocalization();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      <Card>
        <div className="text-center p-10">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t('moduleUnderConstruction')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {t('featureComingSoon').replace('{title}', title)}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PlaceholderPage;