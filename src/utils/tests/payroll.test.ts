
declare var describe: any;
declare var it: any;
declare var expect: any;

import { calculatePayroll } from '../payroll';
import { COUNTRIES } from '../../constants';
import type { LocalizationSettings } from '../../types';

describe('Payroll Calculator', () => {
    // Mock Localization Settings
    const mockLocalizationMG: LocalizationSettings = {
        country: 'MG',
        currency: 'MGA',
        currencySymbol: 'Ar',
        thousandsSeparator: ' ',
        decimalSeparator: ',',
        monetaryDecimals: 0,
        nonMonetaryDecimals: 2,
        denominations: [],
        coordinateFormat: 'DMS'
    };

    const mockLocalizationUS: LocalizationSettings = {
        ...mockLocalizationMG,
        country: 'US',
        currency: 'USD'
    };

    describe('Madagascar (MG) Logic', () => {
        it('should calculate CNaPS and Sanitary deductions correctly (1% each, capped)', () => {
            const grossWage = 100000;
            const result = calculatePayroll(grossWage, 0, 0, 0, mockLocalizationMG);

            const cnaps = result.deductions.find(d => d.label === 'CNaPS');
            const sanitary = result.deductions.find(d => d.label === 'OSTIE / SANITAIRE');

            expect(cnaps?.amount).toBe(1000); // 1% of 100k
            expect(sanitary?.amount).toBe(1000); // 1% of 100k
        });

        it('should apply CNaPS cap correctly', () => {
            // Cap is 2,041,600 MGA (defined in constants.ts). 1% of cap is 20,416.
            const highWage = 5000000; // Well above cap
            const result = calculatePayroll(highWage, 0, 0, 0, mockLocalizationMG);

            const cnaps = result.deductions.find(d => d.label === 'CNaPS');
            expect(cnaps?.amount).toBeCloseTo(20416); // 1% of cap, not 1% of 5M
        });

        it('should calculate IRSA (Income Tax) progressive brackets correctly', () => {
            // Bracket 1: 0 - 350,000 => 0%
            // Wage: 300,000
            const lowWage = 300000;
            const resultLow = calculatePayroll(lowWage, 0, 0, 0, mockLocalizationMG);
            const irsaLow = resultLow.deductions.find(d => d.label === 'IRSA');
            // Should hit minimum perception if tax is 0 but income exists? 
            // Logic says if taxableBase > 0.
            // 300k - (1% + 1%) = 294k taxable.
            // Tax = 0. Max(0, 3000) = 3000 minimum.
            expect(irsaLow?.amount).toBe(3000); 

            // Wage: 400,000
            // Deductions: 8,000 (2%)
            // Taxable: 392,000
            // 0-350k: 0
            // 350k-392k: 42,000 * 5% = 2,100
            // Max(2100, 3000) = 3000 minimum perception
            const medWage = 400000;
            const resultMed = calculatePayroll(medWage, 0, 0, 0, mockLocalizationMG);
            const irsaMed = resultMed.deductions.find(d => d.label === 'IRSA');
            expect(irsaMed?.amount).toBe(3000);
        });
    });

    describe('Fallback Logic', () => {
        it('should perform basic subtraction if no country config exists', () => {
            // US has no config in constants.ts currently
            const result = calculatePayroll(1000, 100, 0, 50, mockLocalizationUS);
            
            expect(result.totalGross).toBe(1100); // 1000 + 100
            expect(result.totalDeductions).toBe(50); // Just other deductions
            expect(result.netPay).toBe(1050);
        });
    });
});
