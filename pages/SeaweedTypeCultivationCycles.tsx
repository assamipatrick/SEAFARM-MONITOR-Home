
import React from 'react';
import { useParams } from 'react-router-dom';
import { CultivationCycleList } from '../components/CultivationCycleList';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';

const SeaweedTypeCultivationCycles: React.FC = () => {
    const { typeId } = useParams<{ typeId: string }>();
    const { seaweedTypes } = useData();
    const { t } = useLocalization();

    const seaweedType = seaweedTypes.find(s => s.id === typeId);
    const pageTitle = seaweedType 
        ? `${t('cultivationCycleManagementTitle')} - ${seaweedType.name}` 
        : t('cultivationCycleManagementTitle');

    if (!typeId) {
        return <div>Seaweed type not found</div>;
    }

    return <CultivationCycleList initialFilters={{ seaweedTypeId: typeId }} pageTitle={pageTitle} />;
};

export default SeaweedTypeCultivationCycles;