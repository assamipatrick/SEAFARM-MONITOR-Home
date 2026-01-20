import React, { useState, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Icon from './ui/Icon';
import type { CuttingOperation, CultivationCycle } from '../types';

interface CascadeDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  operation: CuttingOperation | null;
  relatedCycles: CultivationCycle[];
}

const CascadeDeleteConfirmationModal: React.FC<CascadeDeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  operation,
  relatedCycles
}) => {
  const { t } = useLocalization();
  const [currentStep, setCurrentStep] = useState(0);
  
  const impactAnalysis = useMemo(() => {
    if (!operation || relatedCycles.length === 0) {
      return {
        totalCycles: 0,
        planted: 0,
        growing: 0,
        harvested: 0,
        dried: 0,
        bagged: 0,
        inStock: 0,
        exported: 0,
        hasHarvestedData: false,
        hasDriedData: false,
        hasBaggedData: false,
        hasStockData: false,
        hasExportData: false
      };
    }

    return {
      totalCycles: relatedCycles.length,
      planted: relatedCycles.filter(c => c.status === 'PLANTED').length,
      growing: relatedCycles.filter(c => c.status === 'GROWING').length,
      harvested: relatedCycles.filter(c => c.harvestDate).length,
      dried: relatedCycles.filter(c => c.dryingCompletionDate).length,
      bagged: relatedCycles.filter(c => c.baggedDate).length,
      inStock: relatedCycles.filter(c => c.stockDate).length,
      exported: relatedCycles.filter(c => c.exportDate).length,
      hasHarvestedData: relatedCycles.some(c => c.harvestDate),
      hasDriedData: relatedCycles.some(c => c.dryingCompletionDate),
      hasBaggedData: relatedCycles.some(c => c.baggedDate),
      hasStockData: relatedCycles.some(c => c.stockDate),
      hasExportData: relatedCycles.some(c => c.exportDate)
    };
  }, [operation, relatedCycles]);

  const confirmationSteps = useMemo(() => {
    const steps: { title: string; message: string; icon: string; color: string }[] = [
      {
        title: t('confirmDeleteCuttingOperation'),
        message: t('confirmDeleteCuttingOperationMessage'),
        icon: 'AlertTriangle',
        color: 'text-yellow-600'
      }
    ];

    if (impactAnalysis.hasHarvestedData) {
      steps.push({
        title: t('confirmDeleteHarvestData'),
        message: t('confirmDeleteHarvestDataMessage').replace('{count}', String(impactAnalysis.harvested)),
        icon: 'AlertTriangle',
        color: 'text-orange-600'
      });
    }

    if (impactAnalysis.hasDriedData) {
      steps.push({
        title: t('confirmDeleteDryingData'),
        message: t('confirmDeleteDryingDataMessage').replace('{count}', String(impactAnalysis.dried)),
        icon: 'AlertTriangle',
        color: 'text-orange-600'
      });
    }

    if (impactAnalysis.hasBaggedData) {
      steps.push({
        title: t('confirmDeleteBaggingData'),
        message: t('confirmDeleteBaggingDataMessage').replace('{count}', String(impactAnalysis.bagged)),
        icon: 'AlertTriangle',
        color: 'text-red-600'
      });
    }

    if (impactAnalysis.hasStockData) {
      steps.push({
        title: t('confirmDeleteStockData'),
        message: t('confirmDeleteStockDataMessage').replace('{count}', String(impactAnalysis.inStock)),
        icon: 'XCircle',
        color: 'text-red-600'
      });
    }

    if (impactAnalysis.hasExportData) {
      steps.push({
        title: t('confirmDeleteExportData'),
        message: t('confirmDeleteExportDataMessage').replace('{count}', String(impactAnalysis.exported)),
        icon: 'XCircle',
        color: 'text-red-700'
      });
    }

    return steps;
  }, [t, impactAnalysis]);

  const handleNext = () => {
    if (currentStep < confirmationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  if (!operation || relatedCycles.length === 0) {
    return null;
  }

  const currentStepData = confirmationSteps[currentStep];
  const progress = ((currentStep + 1) / confirmationSteps.length) * 100;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('cascadeDeleteConfirmation')} widthClass="max-w-2xl">
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                {t('step')} {currentStep + 1} / {confirmationSteps.length}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
            />
          </div>
        </div>

        {/* Current Step Content */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Icon name={currentStepData.icon as any} className={`w-12 h-12 flex-shrink-0 ${currentStepData.color}`} />
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">{currentStepData.title}</h3>
              <p className="text-gray-700 dark:text-gray-300">{currentStepData.message}</p>
            </div>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Icon name="Info" className="w-5 h-5 text-blue-600" />
            {t('deletionImpactSummary')}
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span>{t('totalCycles')}:</span>
              <span className="font-bold">{impactAnalysis.totalCycles}</span>
            </div>
            {impactAnalysis.harvested > 0 && (
              <div className="flex justify-between">
                <span>{t('harvested')}:</span>
                <span className="font-bold text-orange-600">{impactAnalysis.harvested}</span>
              </div>
            )}
            {impactAnalysis.dried > 0 && (
              <div className="flex justify-between">
                <span>{t('dried')}:</span>
                <span className="font-bold text-orange-600">{impactAnalysis.dried}</span>
              </div>
            )}
            {impactAnalysis.bagged > 0 && (
              <div className="flex justify-between">
                <span>{t('bagged')}:</span>
                <span className="font-bold text-red-600">{impactAnalysis.bagged}</span>
              </div>
            )}
            {impactAnalysis.inStock > 0 && (
              <div className="flex justify-between">
                <span>{t('inStock')}:</span>
                <span className="font-bold text-red-600">{impactAnalysis.inStock}</span>
              </div>
            )}
            {impactAnalysis.exported > 0 && (
              <div className="flex justify-between">
                <span>{t('exported')}:</span>
                <span className="font-bold text-red-700">{impactAnalysis.exported}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>{t('warning')}:</strong> {t('cascadeDeleteWarning')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleNext}
          >
            {currentStep < confirmationSteps.length - 1 ? (
              <>
                {t('next')} <Icon name="ChevronRight" className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                <Icon name="Trash2" className="w-4 h-4 mr-1" />
                {t('confirmDelete')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CascadeDeleteConfirmationModal;
