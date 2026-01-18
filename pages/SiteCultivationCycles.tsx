
import React from 'react';
import { useParams } from 'react-router-dom';
import { CultivationCycleList } from '../components/CultivationCycleList';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';

const SiteCultivationCycles: React.FC = () => {
    const { siteId } = useParams<{ siteId: string }>();
    const { sites } = useData();
    const { t } = useLocalization();

    const site = sites.find(s => s.id === siteId);
    const pageTitle = site 
        ? `${t('cultivationCycleManagementTitle')} - ${site.name}` 
        : t('cultivationCycleManagementTitle');

    if (!siteId) {
        return <div>Site not found</div>;
    }

    return <CultivationCycleList initialFilters={{ siteId }} pageTitle={pageTitle} />;
};

export default SiteCultivationCycles;