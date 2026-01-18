import React from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { useLocalization } from '../../contexts/LocalizationContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmDisabled = false,
}) => {
  const { t } = useLocalization();

  const footer = (
    <>
      {confirmDisabled ? (
        <Button variant="secondary" onClick={onClose}>
          {t('close')}
        </Button>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelText || t('cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmText || t('delete')}
          </Button>
        </>
      )}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} widthClass="max-w-md" footer={footer}>
      <div className="flex items-start">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 mr-4">
          <Icon name="AlertTriangle" className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;