
import { commonTranslations } from './locales/common';
import { operationTranslations } from './locales/operations';
import { inventoryTranslations } from './locales/inventory';
import { financeTranslations } from './locales/finance';
import { reportTranslations } from './locales/monitoring_reports';

export const translations = {
  ...commonTranslations,
  ...operationTranslations,
  ...inventoryTranslations,
  ...financeTranslations,
  ...reportTranslations,
};
