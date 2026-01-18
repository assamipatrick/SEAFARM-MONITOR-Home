import type { LocalizationSettings } from '../types';

const formatIntegerPart = (integerStr: string, thousandsSeparator: string): string => {
    if (thousandsSeparator === '') return integerStr;
    // This regex adds the separator for thousands, millions, etc.
    return integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
};

export const formatCurrency = (amount: number, settings: LocalizationSettings): string => {
  const { currencySymbol, thousandsSeparator, decimalSeparator, monetaryDecimals } = settings;
  
  if (isNaN(amount) || amount === null) {
      amount = 0;
  }
  
  const fixedAmount = amount.toFixed(monetaryDecimals);
  const [integerPart, decimalPart] = fixedAmount.split('.');

  const formattedIntegerPart = formatIntegerPart(integerPart, thousandsSeparator);
  
  const formattedAmount = decimalPart !== undefined ? `${formattedIntegerPart}${decimalSeparator}${decimalPart}` : formattedIntegerPart;
  
  return `${currencySymbol} ${formattedAmount}`;
};

export const formatNumber = (amount: number, settings: LocalizationSettings): string => {
    const { thousandsSeparator, decimalSeparator, nonMonetaryDecimals } = settings;

    if (isNaN(amount) || amount === null) {
        amount = 0;
    }

    const fixedAmount = amount.toFixed(nonMonetaryDecimals);
    const [integerPart, decimalPart] = fixedAmount.split('.');

    const formattedIntegerPart = formatIntegerPart(integerPart, thousandsSeparator);
    
    return decimalPart !== undefined ? `${formattedIntegerPart}${decimalSeparator}${decimalPart}` : formattedIntegerPart;
};

export const parseNumber = (formattedString: string, settings: LocalizationSettings): number => {
    const { decimalSeparator, thousandsSeparator } = settings;

    // 1. Remove all thousands separators.
    const withoutThousands = formattedString.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
    
    // 2. Replace decimal separator with a dot.
    const withDotDecimal = withoutThousands.replace(new RegExp(`\\${decimalSeparator}`, 'g'), '.');
    
    // 3. Remove everything else that's not a digit or a dot or a leading minus.
    const cleaned = withDotDecimal.replace(/[^0-9.-]/g, '');

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};
