
import { COUNTRIES } from '../constants';
import type { LocalizationSettings } from '../types';

export interface PayrollCalculationResult {
    baseSalary: number;
    bonuses: number;
    overtime: number;
    totalGross: number;
    deductions: { label: string; amount: number }[];
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
}

export const calculatePayroll = (
    baseSalary: number,
    bonuses: number,
    overtime: number,
    otherDeductions: number,
    localization: LocalizationSettings,
    options: { appliedDeductions?: string[] } = {}
): PayrollCalculationResult => {
    
    // Find country config, default to Madagascar ('MG') if not found for the selected country
    let countryConfig = COUNTRIES.find(c => c.code === localization.country)?.payroll;
    if (!countryConfig) {
        countryConfig = COUNTRIES.find(c => c.code === 'MG')?.payroll;
    }

    // Fallback if no payroll config at all (not even MG)
    if (!countryConfig) {
        const totalGross = baseSalary + bonuses + overtime;
        const totalDeductions = otherDeductions;
        const netPay = totalGross - totalDeductions;
        return { baseSalary, bonuses, overtime, totalGross, deductions: [], otherDeductions, totalDeductions, netPay };
    }
    
    const { constants, labels } = countryConfig;

    // Default to all known deductions if none are specified
    const allDeductionKeys = constants.socialContributions.map(sc => sc.key);
    const appliedDeductionKeys = options.appliedDeductions === undefined ? allDeductionKeys : options.appliedDeductions;

    const totalGross = baseSalary + bonuses + overtime;
    const deductions: { label: string; amount: number }[] = [];

    let socialContributionsTotal = 0;

    // Calculate Social Contributions based on provided keys
    if (appliedDeductionKeys.length > 0) {
        constants.socialContributions.forEach(sc => {
            if (appliedDeductionKeys.includes(sc.key)) {
                const applicableGross = sc.cap ? Math.min(totalGross, sc.cap) : totalGross;
                const deductionAmount = applicableGross * sc.rate;
                socialContributionsTotal += deductionAmount;
                const label = labels.socialContributions.find(l => l.key === sc.key)?.label || sc.key;
                deductions.push({ label, amount: deductionAmount });
            }
        });
    }

    const taxableBase = totalGross - socialContributionsTotal;

    // Calculate Income Tax (Progressive)
    let incomeTax = 0;
    if (taxableBase > 0) {
        for (const bracket of constants.incomeTax.brackets) {
            if (taxableBase > bracket.from) {
                const amountInBracket = Math.min(taxableBase, bracket.to === Infinity ? taxableBase : bracket.to) - bracket.from;
                if (amountInBracket > 0) {
                    incomeTax += amountInBracket * bracket.rate;
                }
            }
        }
    }
    
    // Apply minimum perception if applicable
    if (constants.incomeTax.minimumPerception && incomeTax > 0) {
        incomeTax = Math.max(incomeTax, constants.incomeTax.minimumPerception);
    }
    
    if (incomeTax > 0) {
        deductions.push({ label: labels.incomeTax, amount: incomeTax });
    }

    const statutoryDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const totalDeductions = statutoryDeductions + otherDeductions;
    const netPay = totalGross - totalDeductions;

    return {
        baseSalary,
        bonuses,
        overtime,
        totalGross,
        deductions,
        otherDeductions,
        totalDeductions,
        netPay,
    };
};
