
import React, { useState, useMemo, useCallback, FC, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { formatCurrency, formatNumber } from '../utils/formatters';
import type { MonthlyPayment, Repayment } from '../types';
import { RecipientType } from '../types';
import MonthlyPaymentFormModal from '../components/MonthlyPaymentFormModal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Modal from '../components/ui/Modal';
import { calculatePayroll, type PayrollCalculationResult } from '../utils/payroll';
import { COUNTRIES } from '../constants';
import PrintablePaymentSheet, { type SheetData } from '../components/PrintablePaymentSheet';
import { numberToWords } from '../utils/numberToWords';
import { initiateMobileMoneyPayment } from '../services/mobileMoneyService';
import StatusBadge from '../components/ui/StatusBadge';
import PrintableFarmerReceipt, { type ReceiptData } from '../components/printable/PrintableFarmerReceipt';

type SortableKeys = keyof MonthlyPayment | 'recipientName';

interface FarmerPayee {
    id: string;
    type: RecipientType.FARMER;
    name: string;
    siteName: string;
    baseAmount: number;
    adjustment: number;
    deduction: number;
    netAmount: number;
    creditBalance?: number;
    selected: boolean;
}

interface FarmerWetPayee extends FarmerPayee {
    harvestedWeightKg: number;
    cuttingsWeightKg: number;
    netWeightKg: number;
    wetPrice: number;
    cycleIds: string[];
}

interface FarmerDryPayee extends FarmerPayee {
    totalWeightKg: number;
    dryPrice: number;
    deliveryIds: string[];
    totalBags: number;
}

interface ServiceProviderPayee {
    id: string; // Operation ID
    serviceProviderId: string;
    type: RecipientType.SERVICE_PROVIDER;
    name: string;
    date: string;
    unpaidOperations: number;
    baseAmount: number;
    adjustment: number;
    deduction: number;
    netAmount: number;
    selected: boolean;
    operationIds: string[];
    totalLines: number;
    averageUnitPrice: number | null;
}


interface EmployeePayee {
    id: string;
    type: RecipientType.EMPLOYEE;
    name: string;
    siteName: string;
    selected: boolean;
    baseSalary: number;
    bonuses: number;
    overtime: number;
    totalGross: number;
    deductions: { label: string; amount: number }[];
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
    netAmount: number;
    baseAmount: number;
    deduction: number;
}

type Payee = FarmerWetPayee | FarmerDryPayee | ServiceProviderPayee | EmployeePayee;

interface RunConfig {
    periodName: string;
    startDate: string;
    endDate: string;
    paymentType: 'farmer_wet' | 'farmer_dry' | 'service_provider' | 'employee_payroll';
    siteId: string;
    seaweedTypeId: string;
}

const formatPeriod = (period: string, language: 'en' | 'fr', t: (key: string) => string): string => {
    try {
        const [year, month] = period.split('-').map(Number);
        const date = new Date(year, month - 1);
        return date.toLocaleDateString(language, { month: 'long', year: 'numeric' });
    } catch (e) {
        return period;
    }
};

const DeductionConfigModal: FC<any> = () => null;

const CommonPaymentTable: FC<{ onSelectAll: (checked: boolean) => void; allSelected: boolean; header: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }> = ({ onSelectAll, allSelected, header, children, footer }) => (
    <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
                <th className="p-3 w-4"><Checkbox checked={allSelected} onChange={e => onSelectAll(e.target.checked)} /></th>
                {header}
            </tr>
        </thead>
        <tbody>{children}</tbody>
        {footer && <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-200 dark:border-gray-600">{footer}</tfoot>}
    </table>
);

const FarmerWetPaymentTable: FC<{payees: FarmerWetPayee[], onSelectOne: (id: string, checked: boolean) => void, onSelectAll: (checked: boolean) => void, allSelected: boolean, onUpdate: (id: string, field: 'adjustment', value: string) => void}> = ({payees, onSelectOne, onSelectAll, allSelected, onUpdate}) => { 
    const { t } = useLocalization();
    const { settings } = useSettings();
    
    const totals = useMemo(() => payees.filter(p => p.selected).reduce((acc, p) => ({
        weight: acc.weight + p.netWeightKg,
        base: acc.base + p.baseAmount,
        deduction: acc.deduction + p.deduction,
        net: acc.net + p.netAmount
    }), { weight: 0, base: 0, deduction: 0, net: 0 }), [payees]);

    return <CommonPaymentTable onSelectAll={onSelectAll} allSelected={allSelected} header={<>
        <th className="p-3">{t('farmer')}</th>
        <th className="p-3 text-right">{t('netWeightKg')}</th>
        <th className="p-3 text-right">{t('wetPrice')}</th>
        <th className="p-3 text-right">{t('baseAmount')}</th>
        <th className="p-3 text-right">{t('adjustment')}</th>
        <th className="p-3 text-right">{t('creditDeduction')}</th>
        <th className="p-3 text-right font-bold">{t('netPayable')}</th>
    </>} footer={
        <tr>
            <td colSpan={2} className="p-3 text-right uppercase">{t('total')}</td>
            <td className="p-3 text-right">{formatNumber(totals.weight, settings.localization)}</td>
            <td className="p-3 text-right">-</td>
            <td className="p-3 text-right">{formatCurrency(totals.base, settings.localization)}</td>
            <td className="p-2 text-right">-</td>
            <td className="p-3 text-right text-red-600">{formatCurrency(totals.deduction, settings.localization)}</td>
            <td className="p-3 text-right">{formatCurrency(totals.net, settings.localization)}</td>
        </tr>
    }>
        {payees.map(p => <tr key={p.id} className="border-b dark:border-gray-700/50"><td className="p-3"><Checkbox checked={p.selected} onChange={e => onSelectOne(p.id, e.target.checked)}/></td><td className="p-3">{p.name}</td><td className="p-3 text-right">{formatNumber(p.netWeightKg, settings.localization)}</td><td className="p-3 text-right">{formatCurrency(p.wetPrice, settings.localization)}</td><td className="p-3 text-right">{formatCurrency(p.baseAmount, settings.localization)}</td>
        <td className="p-2 text-right"><Input type="number" value={p.adjustment} onChange={e => onUpdate(p.id, 'adjustment', e.target.value)} className="text-right !py-1" /></td>
        <td className="p-3 text-right text-red-600">{formatCurrency(p.deduction, settings.localization)}</td>
        <td className="p-3 text-right font-bold">{formatCurrency(p.netAmount, settings.localization)}</td></tr>)}
    </CommonPaymentTable>
};
const FarmerDryPaymentTable: FC<{payees: FarmerDryPayee[], onSelectOne: (id: string, checked: boolean) => void, onSelectAll: (checked: boolean) => void, allSelected: boolean, onUpdate: (id: string, field: 'adjustment', value: string) => void}> = ({payees, onSelectOne, onSelectAll, allSelected, onUpdate}) => {
     const { t } = useLocalization();
    const { settings } = useSettings();
    
    const totals = useMemo(() => payees.filter(p => p.selected).reduce((acc, p) => ({
        weight: acc.weight + p.totalWeightKg,
        base: acc.base + p.baseAmount,
        deduction: acc.deduction + p.deduction,
        net: acc.net + p.netAmount
    }), { weight: 0, base: 0, deduction: 0, net: 0 }), [payees]);

    return <CommonPaymentTable onSelectAll={onSelectAll} allSelected={allSelected} header={<>
        <th className="p-3">{t('farmer')}</th>
        <th className="p-3 text-right">{t('totalWeightKg')}</th>
        <th className="p-3 text-right">{t('dryPrice')}</th>
        <th className="p-3 text-right">{t('baseAmount')}</th>
        <th className="p-3 text-right">{t('adjustment')}</th>
        <th className="p-3 text-right">{t('creditDeduction')}</th>
        <th className="p-3 text-right font-bold">{t('netPayable')}</th>
    </>} footer={
        <tr>
            <td colSpan={2} className="p-3 text-right uppercase">{t('total')}</td>
            <td className="p-3 text-right">{formatNumber(totals.weight, settings.localization)}</td>
            <td className="p-3 text-right">-</td>
            <td className="p-3 text-right">{formatCurrency(totals.base, settings.localization)}</td>
            <td className="p-3 text-right">-</td>
            <td className="p-3 text-right text-red-600">{formatCurrency(totals.deduction, settings.localization)}</td>
            <td className="p-3 text-right">{formatCurrency(totals.net, settings.localization)}</td>
        </tr>
    }>
        {payees.map(p => <tr key={p.id} className="border-b dark:border-gray-700/50"><td className="p-3"><Checkbox checked={p.selected} onChange={e => onSelectOne(p.id, e.target.checked)}/></td><td className="p-3">{p.name}</td><td className="p-3 text-right">{formatNumber(p.totalWeightKg, settings.localization)}</td><td className="p-3 text-right">{formatCurrency(p.dryPrice, settings.localization)}</td><td className="p-3 text-right">{formatCurrency(p.baseAmount, settings.localization)}</td>
        <td className="p-2 text-right"><Input type="number" value={p.adjustment} onChange={e => onUpdate(p.id, 'adjustment', e.target.value)} className="text-right !py-1" /></td>
        <td className="p-3 text-right text-red-600">{formatCurrency(p.deduction, settings.localization)}</td>
        <td className="p-3 text-right font-bold">{formatCurrency(p.netAmount, settings.localization)}</td></tr>)}
    </CommonPaymentTable>
};
const ServiceProviderPaymentTable: FC<{payees: ServiceProviderPayee[], onSelectOne: (id: string, checked: boolean) => void, onSelectAll: (checked: boolean) => void, allSelected: boolean, onUpdate: (id: string, field: 'adjustment', value: string) => void}> = ({payees, onSelectOne, onSelectAll, allSelected, onUpdate}) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    
    const totals = useMemo(() => payees.filter(p => p.selected).reduce((acc, p) => ({
        lines: acc.lines + p.totalLines,
        base: acc.base + p.baseAmount,
        net: acc.net + p.netAmount
    }), { lines: 0, base: 0, net: 0 }), [payees]);

    return <CommonPaymentTable onSelectAll={onSelectAll} allSelected={allSelected} header={<>
        <th className="p-3">{t('serviceDate')}</th>
        <th className="p-3">{t('serviceProvider')}</th>
        <th className="p-3 text-right">{t('numberOfLines')}</th>
        <th className="p-3 text-right">{t('baseAmount')}</th>
        <th className="p-3 text-right">{t('adjustment')}</th>
        <th className="p-3 text-right font-bold">{t('netPayable')}</th>
    </>} footer={
         <tr>
            <td colSpan={3} className="p-3 text-right uppercase">{t('total')}</td>
            <td className="p-3 text-right">{totals.lines}</td>
            <td className="p-3 text-right">{formatCurrency(totals.base, settings.localization)}</td>
            <td className="p-2 text-right">-</td>
            <td className="p-3 text-right">{formatCurrency(totals.net, settings.localization)}</td>
        </tr>
    }>
        {payees.map(p => <tr key={p.id} className="border-b dark:border-gray-700/50">
            <td className="p-3"><Checkbox checked={p.selected} onChange={e => onSelectOne(p.id, e.target.checked)}/></td>
            <td className="p-3">{p.date}</td>
            <td className="p-3">{p.name}</td>
            <td className="p-3 text-right">{p.totalLines}</td>
            <td className="p-3 text-right">{formatCurrency(p.baseAmount, settings.localization)}</td>
            <td className="p-2 text-right"><Input type="number" value={p.adjustment} onChange={e => onUpdate(p.id, 'adjustment', e.target.value)} className="text-right !py-1" /></td>
            <td className="p-3 text-right font-bold">{formatCurrency(p.netAmount, settings.localization)}</td>
        </tr>)}
    </CommonPaymentTable>
};

const EmployeePayrollTable: FC<{payees: EmployeePayee[], onSelectOne: (id: string, checked: boolean) => void, onSelectAll: (checked: boolean) => void, allSelected: boolean, onUpdate: (id: string, field: 'bonuses' | 'overtime', value: string) => void}> = ({payees, onSelectOne, onSelectAll, allSelected, onUpdate}) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    
    const totals = useMemo(() => payees.filter(p => p.selected).reduce((acc, p) => ({
        base: acc.base + p.baseSalary,
        gross: acc.gross + p.totalGross,
        deduction: acc.deduction + p.totalDeductions,
        net: acc.net + p.netPay
    }), { base: 0, gross: 0, deduction: 0, net: 0 }), [payees]);

    return <CommonPaymentTable onSelectAll={onSelectAll} allSelected={allSelected} header={<>
        <th className="p-3">{t('employee')}</th>
        <th className="p-3 text-right">{t('grossSalary')}</th>
        <th className="p-3 w-32 text-right">{t('bonuses')}</th>
        <th className="p-3 w-32 text-right">{t('overtime')}</th>
        <th className="p-3 text-right">{t('totalGross')}</th>
        <th className="p-3 text-right">{t('totalDeductions')}</th>
        <th className="p-3 text-right font-bold">{t('netPay')}</th>
    </>} footer={
        <tr>
            <td colSpan={2} className="p-3 text-right uppercase">{t('total')}</td>
            <td className="p-3 text-right">{formatCurrency(totals.base, settings.localization)}</td>
            <td className="p-2 text-right">-</td>
            <td className="p-2 text-right">-</td>
            <td className="p-3 text-right">{formatCurrency(totals.gross, settings.localization)}</td>
            <td className="p-3 text-right">{formatCurrency(totals.deduction, settings.localization)}</td>
            <td className="p-3 text-right">{formatCurrency(totals.net, settings.localization)}</td>
        </tr>
    }>
        {payees.map(p => <tr key={p.id} className="border-b dark:border-gray-700/50"><td className="p-3"><Checkbox checked={p.selected} onChange={e => onSelectOne(p.id, e.target.checked)}/></td><td className="p-3">{p.name}</td><td className="p-3 text-right">{formatCurrency(p.baseSalary, settings.localization)}</td>
        <td className="p-2 text-right"><Input type="number" value={p.bonuses} onChange={e => onUpdate(p.id, 'bonuses', e.target.value)} className="text-right !py-1" /></td>
        <td className="p-2 text-right"><Input type="number" value={p.overtime} onChange={e => onUpdate(p.id, 'overtime', e.target.value)} className="text-right !py-1" /></td>
        <td className="p-3 text-right">{formatCurrency(p.totalGross, settings.localization)}</td>
        <td className="p-3 text-right">{formatCurrency(p.totalDeductions, settings.localization)}</td>
        <td className="p-3 text-right font-bold">{formatCurrency(p.netPay, settings.localization)}</td></tr>)}
    </CommonPaymentTable>
};

const PaymentReview: React.FC<{ onCancel: () => void; onConfirmSuccess: () => void; config: RunConfig }> = ({ onCancel, onConfirmSuccess, config }) => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { 
        farmers, sites, seaweedTypes, cultivationCycles, modules, farmerCredits, repayments, farmerDeliveries, cuttingOperations, serviceProviders, employees,
        addMultipleMonthlyPayments, addMultipleRepayments, updateMultipleCuttingOperations, markCyclesAsPaid, markDeliveriesAsPaid
    } = useData();
    const [payees, setPayees] = useState<Payee[]>([]);
    const [deductionConfig, setDeductionConfig] = useState({ enabled: true, type: 'percentage' as 'percentage' | 'fixed', value: 100 });
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfData, setPdfData] = useState<SheetData | null>(null);

    const calculateInitialPayees = useCallback(() => {
        let calculatedPayees: Payee[] = [];
        const { paymentType, startDate, endDate, siteId, seaweedTypeId } = config;
        
        const getFarmerCreditBalance = (farmerId: string) => {
            const credits = farmerCredits.filter(c => c.farmerId === farmerId).reduce((sum, c) => sum + c.totalAmount, 0);
            const paid = repayments.filter(r => r.farmerId === farmerId).reduce((sum, r) => sum + r.amount, 0);
            return credits - paid;
        };

        if (paymentType === 'farmer_wet') {
            const relevantFarmers = farmers.filter(f => siteId === 'all' || f.siteId === siteId);
            calculatedPayees = relevantFarmers.map(farmer => {
                const cycles = cultivationCycles.filter(c => {
                    const module = modules.find(m => m.id === c.moduleId);
                    return module?.farmerId === farmer.id && c.harvestDate && c.harvestDate >= startDate && c.harvestDate <= endDate && !c.paymentRunId && (seaweedTypeId === 'all' || c.seaweedTypeId === seaweedTypeId);
                });
                if (cycles.length === 0) return null;
                const baseAmount = cycles.reduce((sum, c) => {
                    const cycleNetWeight = (c.harvestedWeight || 0) - (c.cuttingsTakenAtHarvestKg || 0);
                    const price = seaweedTypes.find(st => st.id === c.seaweedTypeId)?.wetPrice || 0;
                    return sum + (cycleNetWeight * price);
                }, 0);
                
                const totalNetWeight = cycles.reduce((sum, c) => sum + ((c.harvestedWeight || 0) - (c.cuttingsTakenAtHarvestKg || 0)), 0);
                const avgWetPrice = totalNetWeight > 0 ? baseAmount / totalNetWeight : 0;

                const payee: FarmerWetPayee = {
                    id: farmer.id, type: RecipientType.FARMER, name: `${farmer.firstName} ${farmer.lastName}`, siteName: sites.find(s => s.id === farmer.siteId)?.name || '', baseAmount, adjustment: 0, deduction: 0, netAmount: baseAmount,
                    creditBalance: getFarmerCreditBalance(farmer.id), selected: true, cycleIds: cycles.map(c => c.id),
                    harvestedWeightKg: cycles.reduce((sum, c) => sum + (c.harvestedWeight || 0), 0),
                    cuttingsWeightKg: cycles.reduce((sum, c) => sum + (c.cuttingsTakenAtHarvestKg || 0), 0),
                    netWeightKg: totalNetWeight,
                    wetPrice: avgWetPrice,
                };
                return payee;
            }).filter((p): p is FarmerWetPayee => p !== null && p.baseAmount > 0);
        } else if (paymentType === 'farmer_dry') {
            const relevantFarmers = farmers.filter(f => siteId === 'all' || f.siteId === siteId);
            const seaweedPriceMap = new Map(seaweedTypes.map(st => [st.id, st.dryPrice]));
            
            calculatedPayees = relevantFarmers.map(farmer => {
                const deliveries = farmerDeliveries.filter(d =>
                    d.farmerId === farmer.id &&
                    d.date >= startDate &&
                    d.date <= endDate &&
                    !d.paymentRunId &&
                    (seaweedTypeId === 'all' || d.seaweedTypeId === seaweedTypeId)
                );

                if(deliveries.length === 0) return null;

                const baseAmount = deliveries.reduce((sum, d) => {
                    const price = seaweedPriceMap.get(d.seaweedTypeId) || 0;
                    return sum + (d.totalWeightKg * price);
                }, 0);

                const totalWeightKg = deliveries.reduce((sum, d) => sum + d.totalWeightKg, 0);
                const totalBags = deliveries.reduce((sum, d) => sum + d.totalBags, 0);
                const dryPrice = deliveries.length > 0 && totalWeightKg > 0 ? (baseAmount / totalWeightKg) : 0;

                const payee: FarmerDryPayee = {
                    id: farmer.id,
                    type: RecipientType.FARMER,
                    name: `${farmer.firstName} ${farmer.lastName}`,
                    siteName: sites.find(s => s.id === farmer.siteId)?.name || '',
                    totalWeightKg, dryPrice, baseAmount,
                    totalBags,
                    adjustment: 0,
                    deduction: 0,
                    netAmount: baseAmount,
                    creditBalance: getFarmerCreditBalance(farmer.id),
                    selected: true,
                    deliveryIds: deliveries.map(d => d.id),
                };
                return payee;
            }).filter((p): p is FarmerDryPayee => p !== null && p.baseAmount > 0);
        } else if (paymentType === 'service_provider') {
            // Filter operations directly to list them individually (per operation)
            const relevantOps = cuttingOperations.filter(op => 
                !op.isPaid &&
                op.date >= startDate &&
                op.date <= endDate &&
                (siteId === 'all' || op.siteId === siteId) &&
                (seaweedTypeId === 'all' || op.seaweedTypeId === seaweedTypeId)
            );

            calculatedPayees = relevantOps.map(op => {
                const provider = serviceProviders.find(p => p.id === op.serviceProviderId);
                const totalLines = op.moduleCuts.reduce((s, mc) => s + mc.linesCut, 0);

                // Create a payee entry per operation
                const payee: ServiceProviderPayee = {
                    id: op.id, // Use Operation ID as the row ID
                    serviceProviderId: op.serviceProviderId,
                    type: RecipientType.SERVICE_PROVIDER,
                    name: provider?.name || 'Unknown',
                    date: op.date, // Specific Date of Realization
                    unpaidOperations: 1,
                    baseAmount: op.totalAmount,
                    adjustment: 0,
                    deduction: 0,
                    netAmount: op.totalAmount,
                    selected: true,
                    operationIds: [op.id],
                    totalLines,
                    averageUnitPrice: op.unitPrice
                };
                return payee;
            }).filter((p): p is ServiceProviderPayee => p !== null && p.baseAmount > 0);
        } else if (paymentType === 'employee_payroll') {
            const payrollConfig = COUNTRIES.find(c => c.code === settings.localization.country)?.payroll;
            if (!payrollConfig) {
                alert(t('alert_noPayrollConfig'));
                return;
            }
            const relevantEmployees = employees.filter(e => siteId === 'all' || e.siteId === siteId);
            calculatedPayees = relevantEmployees.map(employee => {
                const calc = calculatePayroll(employee.grossWage, 0, 0, 0, settings.localization);
                const payee: EmployeePayee = {
                    id: employee.id, type: RecipientType.EMPLOYEE, name: `${employee.firstName} ${employee.lastName}`, siteName: sites.find(s => s.id === employee.siteId)?.name || '', selected: true,
                    baseAmount: calc.totalGross, deduction: calc.totalDeductions, netAmount: calc.netPay,
                    ...calc
                };
                return payee;
            });
        }
        
        setPayees(calculatedPayees);
    }, [config, farmers, sites, seaweedTypes, cultivationCycles, modules, farmerCredits, repayments, farmerDeliveries, cuttingOperations, serviceProviders, employees, settings.localization, t]);
    
    useEffect(() => {
        calculateInitialPayees();
    }, [calculateInitialPayees]);

    const handlePayeeUpdate = (id: string, field: 'adjustment' | 'bonuses' | 'overtime', value: string) => {
        const numericValue = parseFloat(value) || 0;
        setPayees(prev => prev.map(p => {
            if (p.id === id) {
                if (p.type === RecipientType.EMPLOYEE) {
                    const updatedPayee = { ...p, [field]: numericValue };
                    const calc = calculatePayroll(updatedPayee.baseSalary, updatedPayee.bonuses, updatedPayee.overtime, updatedPayee.otherDeductions, settings.localization);
                    return { ...updatedPayee, ...calc, baseAmount: calc.totalGross, deduction: calc.totalDeductions, netAmount: calc.netPay };
                } else if ('adjustment' in p) {
                    const newBase = p.baseAmount - p.adjustment + numericValue;
                    return { ...p, adjustment: numericValue, netAmount: newBase - p.deduction };
                }
            }
            return p;
        }));
    };
    
    useEffect(() => {
        setPayees(prevPayees => {
            return prevPayees.map(p => {
                if (p.type === RecipientType.FARMER && p.selected) {
                    let newDeduction = 0;
                    const baseAmountWithAdj = p.baseAmount + p.adjustment;
                    if (deductionConfig.enabled && p.creditBalance && p.creditBalance > 0) {
                        if (deductionConfig.type === 'percentage') {
                            newDeduction = (baseAmountWithAdj * deductionConfig.value) / 100;
                        } else {
                            newDeduction = deductionConfig.value;
                        }
                        newDeduction = Math.min(newDeduction, baseAmountWithAdj, p.creditBalance);
                    }
                    return { ...p, deduction: newDeduction, netAmount: baseAmountWithAdj - newDeduction };
                }
                return p;
            });
        });
    }, [deductionConfig, payees.map(p => p.baseAmount + (p.type !== RecipientType.EMPLOYEE ? p.adjustment : 0)).join(',')]);

    const handleDeductionConfigChange = (newConfig: { enabled: boolean; type: 'percentage' | 'fixed'; value: number }) => {
        setDeductionConfig(newConfig);
    };

    const handleSelectOne = (id: string, isSelected: boolean) => {
        setPayees(prev => prev.map(p => p.id === id ? { ...p, selected: isSelected } : p));
    };

    const handleSelectAll = (isSelected: boolean) => {
        setPayees(prev => prev.map(p => ({ ...p, selected: isSelected })));
    };

    const selectedPayees = payees.filter(p => p.selected);
    const allSelected = payees.length > 0 && selectedPayees.length === payees.length;

    const totals = useMemo(() => {
        return selectedPayees.reduce((acc, p) => {
            acc.base += p.baseAmount + (p.type !== RecipientType.EMPLOYEE ? p.adjustment : 0);
            acc.deduction += p.deduction;
            acc.net += p.netAmount;
            return acc;
        }, { base: 0, deduction: 0, net: 0 });
    }, [selectedPayees]);

    const handleConfirmAndPay = () => {
        const paymentRunId = `pr-${Date.now()}`;
        const date = new Date().toISOString().split('T')[0];
        const newPayments: Omit<MonthlyPayment, 'id'>[] = [];
        const newRepayments: Omit<Repayment, 'id'>[] = [];
        const paidOperationIds: string[] = [];
        const paidCycleIds: string[] = [];
        const paidDeliveryIds: string[] = [];

        selectedPayees.forEach(p => {
            if (p.netAmount <= 0 && p.deduction <= 0) return;

            if (p.netAmount > 0) {
                newPayments.push({
                    date,
                    period: config.periodName,
                    recipientType: p.type,
                    // Use serviceProviderId if available (for granular operations), otherwise ID
                    recipientId: (p as any).serviceProviderId || p.id,
                    amount: p.netAmount,
                    method: 'cash',
                    notes: `Payment for period: ${config.startDate} to ${config.endDate}`,
                    paymentRunId,
                    paymentStatus: 'PENDING'
                });
            }

            if ('deduction' in p && p.deduction > 0 && p.type === RecipientType.FARMER) {
                newRepayments.push({
                    date,
                    farmerId: p.id,
                    amount: p.deduction,
                    method: 'harvest_deduction',
                    notes: `Deduction from payment run: ${config.periodName}`,
                    paymentRunId: paymentRunId
                });
            }

            if (p.type === RecipientType.SERVICE_PROVIDER && 'operationIds' in p) {
                paidOperationIds.push(...p.operationIds);
            } else if (config.paymentType === 'farmer_wet' && 'cycleIds' in p) {
                paidCycleIds.push(...(p as FarmerWetPayee).cycleIds);
            } else if (config.paymentType === 'farmer_dry' && 'deliveryIds' in p) {
                paidDeliveryIds.push(...(p as FarmerDryPayee).deliveryIds);
            }
        });

        if (newPayments.length > 0) addMultipleMonthlyPayments(newPayments);
        if (newRepayments.length > 0) addMultipleRepayments(newRepayments);
        if (paidOperationIds.length > 0) updateMultipleCuttingOperations(paidOperationIds, date);
        if (paidCycleIds.length > 0) markCyclesAsPaid(paidCycleIds, paymentRunId);
        if (paidDeliveryIds.length > 0) markDeliveriesAsPaid(paidDeliveryIds, paymentRunId);
        
        onConfirmSuccess();
    };

    const handleGeneratePdf = () => {
        let title = '';
        let beneficiaryTypeLabel = '';
        let columns: SheetData['columns'] = [];

        switch (config.paymentType) {
            case 'farmer_wet':
                title = t('wetDeliveryPaymentSheetTitle');
                beneficiaryTypeLabel = t('farmer');
                columns = [
                    { key: 'name', label: t('farmer'), width: '25%' },
                    { key: 'harvestedWeightKg', label: t('harvestedWeightKg'), align: 'right', format: 'number', width: '12%' },
                    { key: 'cuttingsWeightKg', label: t('cuttingsWeightKg'), align: 'right', format: 'number', width: '12%' },
                    { key: 'netWeightKg', label: t('netWeightKg'), align: 'right', format: 'number', width: '12%' },
                    { key: 'wetPrice', label: t('wetPrice'), align: 'right', format: 'currency', width: '10%' },
                    { key: 'baseAmount', label: t('baseAmount'), align: 'right', format: 'currency', width: '12%' },
                    { key: 'deduction', label: t('creditDeduction'), align: 'right', format: 'currency', width: '12%' },
                    { key: 'netAmount', label: t('netPayable'), align: 'right', format: 'currency', width: '15%' },
                ];
                break;
            case 'farmer_dry':
                title = t('dryDeliveryPaymentSheetTitle');
                beneficiaryTypeLabel = t('farmer');
                columns = [
                    { key: 'name', label: t('farmer'), width: '30%' },
                    { key: 'totalWeightKg', label: t('totalWeightKg'), align: 'right', format: 'number', width: '15%' },
                    { key: 'dryPrice', label: t('pricePerKg'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'baseAmount', label: t('baseAmount'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'deduction', label: t('creditDeduction'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'netAmount', label: t('netPayable'), align: 'right', format: 'currency', width: '20%' },
                ];
                break;
            case 'service_provider':
                title = t('cuttingPaymentSheetTitle');
                beneficiaryTypeLabel = t('provider');
                columns = [
                    { key: 'date', label: t('dateTrans'), width: '10%' },
                    { key: 'name', label: t('provider'), width: '30%' },
                    { key: 'totalLines', label: t('numberOfLines'), align: 'right', format: 'number', width: '15%' },
                    { key: 'averageUnitPrice', label: t('unitPrice'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'netAmount', label: t('montantAPayer'), align: 'right', format: 'currency', width: '15%' },
                ];
                break;
             case 'employee_payroll':
                title = t('employeePayroll');
                beneficiaryTypeLabel = t('employee');
                columns = [
                    { key: 'name', label: t('employee'), width: '25%' },
                    { key: 'baseSalary', label: t('grossSalary'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'totalGross', label: t('totalGross'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'totalDeductions', label: t('totalDeductions'), align: 'right', format: 'currency', width: '15%' },
                    { key: 'netPay', label: t('netPay'), align: 'right', format: 'currency', width: '15%' },
                ];
                break;
        }

        const totalValue = selectedPayees.reduce((sum, p) => sum + p.netAmount, 0);
        const seaweedTypeLabel = config.seaweedTypeId !== 'all' 
            ? seaweedTypes.find(st => st.id === config.seaweedTypeId)?.name 
            : t('various');

        const data: SheetData = {
            title,
            periodName: config.periodName,
            headerInfo: [
                { label: t('date'), value: new Date().toLocaleDateString(language) },
                { label: t('period'), value: `${config.startDate} - ${config.endDate}` },
                { label: t('site'), value: config.siteId === 'all' ? t('allSites') : sites.find(s => s.id === config.siteId)?.name },
                { label: t('seaweedType'), value: seaweedTypeLabel },
            ],
            columns,
            rows: selectedPayees.map(p => ({ beneficiaryName: p.name, ...p })),
            totalLabel: t('totalToPay'),
            totalValue: totalValue,
            totalValueInWords: numberToWords(totalValue, language as 'en'|'fr', settings.localization),
            denominations: settings.localization.denominations,
            beneficiaryTypeLabel: beneficiaryTypeLabel,
            status: 'Unpaid'
        };
        
        setPdfData(data);
        setIsPdfModalOpen(true);
    };

    return (
        <Card title={t('reviewPaymentRun')}>
            <p className="mb-4">{config.periodName} ({config.startDate} to {config.endDate})</p>
            
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">{t('totalPayees')}</p>
                    <p className="text-2xl font-bold">{selectedPayees.length}</p>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">{t('totalBaseAmount')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.base, settings.localization)}</p>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">{t('totalDeductions')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.deduction, settings.localization)}</p>
                </div>
                <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{t('totalNetPayable')}</p>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(totals.net, settings.localization)}</p>
                </div>
            </div>


            <div className="flex justify-between items-center mb-4">
                 <div className="flex gap-4">
                    {config.paymentType.startsWith('farmer') && (
                        <Button variant="secondary" onClick={() => setIsDeductionModalOpen(true)}>
                            <Icon name="Settings" className="w-4 h-4"/>
                            {t('configureDeductions')}
                        </Button>
                    )}
                    <Button onClick={handleGeneratePdf}>
                        <Icon name="Download" className="w-4 h-4"/>
                        {t('downloadPdf')}
                    </Button>
                    <Button onClick={() => setIsConfirmModalOpen(true)} disabled={selectedPayees.length === 0}>
                        <Icon name="Check" className="w-4 h-4"/>
                        {t('confirmAndPay')}
                    </Button>
                </div>
                <Button variant="secondary" onClick={onCancel}>
                    <Icon name="ChevronLeft" className="w-4 h-4" />
                    {t('back')}
                </Button>
            </div>

            <div className="overflow-x-auto">
                 {config.paymentType === 'farmer_wet' && <FarmerWetPaymentTable payees={payees as FarmerWetPayee[]} onSelectOne={handleSelectOne} onSelectAll={handleSelectAll} allSelected={allSelected} onUpdate={handlePayeeUpdate} />}
                 {config.paymentType === 'farmer_dry' && <FarmerDryPaymentTable payees={payees as FarmerDryPayee[]} onSelectOne={handleSelectOne} onSelectAll={handleSelectAll} allSelected={allSelected} onUpdate={handlePayeeUpdate} />}
                 {config.paymentType === 'service_provider' && <ServiceProviderPaymentTable payees={payees as ServiceProviderPayee[]} onSelectOne={handleSelectOne} onSelectAll={handleSelectAll} allSelected={allSelected} onUpdate={handlePayeeUpdate} />}
                 {config.paymentType === 'employee_payroll' && <EmployeePayrollTable payees={payees as EmployeePayee[]} onSelectOne={handleSelectOne} onSelectAll={handleSelectAll} allSelected={allSelected} onUpdate={handlePayeeUpdate} />}
            </div>
            
            {pdfData && (
                <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title={t('printDocuments')} widthClass="max-w-screen-xl">
                    <PrintablePaymentSheet data={pdfData} />
                </Modal>
            )}

             {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleConfirmAndPay}
                    title={t('confirmPayment')}
                    message={t('confirmPaymentMessage').replace('{count}', String(selectedPayees.length))}
                    confirmText={t('confirm')}
                />
            )}
             {isDeductionModalOpen && (
                <DeductionConfigModal
                    isOpen={isDeductionModalOpen}
                    onClose={() => setIsDeductionModalOpen(false)}
                    initialConfig={deductionConfig}
                    onSave={(newConfig: any) => {
                        handleDeductionConfigChange(newConfig);
                        setIsDeductionModalOpen(false);
                    }}
                />
            )}
        </Card>
    );
};

const PaymentHistory: React.FC = () => {
    const { t, language } = useLocalization();
    const { settings } = useSettings();
    const { monthlyPayments, farmers, employees, serviceProviders, deleteMonthlyPayment, updateMonthlyPayment, repayments, cultivationCycles, farmerDeliveries, seaweedTypes, sites } = useData();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<MonthlyPayment | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);


    const recipientMap = useMemo(() => {
        const map = new Map<string, string>();
        farmers.forEach(f => map.set(`${RecipientType.FARMER}-${f.id}`, `${f.firstName} ${f.lastName}`));
        employees.forEach(e => map.set(`${RecipientType.EMPLOYEE}-${e.id}`, `${e.firstName} ${e.lastName}`));
        serviceProviders.forEach(p => map.set(`${RecipientType.SERVICE_PROVIDER}-${p.id}`, p.name));
        return map;
    }, [farmers, employees, serviceProviders]);

    const sortedPayments = useMemo(() => {
        let sortableItems = [...monthlyPayments];
        sortableItems.sort((a, b) => {
            let valA: any, valB: any;
            if (sortConfig.key === 'recipientName') {
                valA = recipientMap.get(`${a.recipientType}-${a.recipientId}`) || '';
                valB = recipientMap.get(`${b.recipientType}-${b.recipientId}`) || '';
            } else {
                valA = a[sortConfig.key as keyof MonthlyPayment];
                valB = b[sortConfig.key as keyof MonthlyPayment];
            }
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [monthlyPayments, sortConfig, recipientMap]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (sortConfig.key !== key) {
            return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        }
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string; }> = ({ sortKey, label }) => (
        <th className="p-3">
            <button onClick={() => requestSort(sortKey)} className="group flex items-center gap-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                {label}
                {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const handleOpenModal = (payment: MonthlyPayment | null = null) => {
        setEditingPayment(payment);
        setIsFormModalOpen(true);
    };

    const handleDeleteClick = (paymentId: string) => {
        setPaymentToDelete(paymentId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (paymentToDelete) {
            deleteMonthlyPayment(paymentToDelete);
        }
        setIsConfirmOpen(false);
        setPaymentToDelete(null);
    };

    const handlePayNow = async (payment: MonthlyPayment) => {
        if (processingIds.has(payment.id)) return;
        
        setProcessingIds(prev => new Set(prev).add(payment.id));
        
        updateMonthlyPayment({ ...payment, paymentStatus: 'PROCESSING' });

        try {
            const result = await initiateMobileMoneyPayment(payment);
            
            if (result.success) {
                updateMonthlyPayment({ 
                    ...payment, 
                    paymentStatus: 'COMPLETED', 
                    transactionId: result.transactionId 
                });
                alert(`Payment Successful! Transaction ID: ${result.transactionId}`);
            } else {
                updateMonthlyPayment({ ...payment, paymentStatus: 'FAILED' });
                alert(`Payment Failed: ${result.message}`);
            }
        } catch (error) {
            console.error("Payment processing error", error);
            updateMonthlyPayment({ ...payment, paymentStatus: 'FAILED' });
            alert("An unexpected error occurred.");
        } finally {
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(payment.id);
                return newSet;
            });
        }
    };
    
    const handlePrintReceipt = (payment: MonthlyPayment) => {
        if (payment.recipientType !== RecipientType.FARMER) {
            alert("Only Farmer receipts are currently supported for detailed printing.");
            return;
        }

        const farmer = farmers.find(f => f.id === payment.recipientId);
        if (!farmer) return;

        const site = sites.find(s => s.id === farmer.siteId);
        const paymentRunId = payment.paymentRunId;
        
        const relatedRepayments = repayments.filter(r => r.farmerId === farmer.id && r.paymentRunId === paymentRunId);
        
        const grossDetails: ReceiptData['grossDetails'] = [];
        
        const relatedCycles = cultivationCycles.filter(c => c.paymentRunId === paymentRunId);
        relatedCycles.forEach(c => {
             const netWeight = (c.harvestedWeight || 0) - (c.cuttingsTakenAtHarvestKg || 0);
             const type = seaweedTypes.find(st => st.id === c.seaweedTypeId);
             grossDetails.push({
                 description: `Harvest: ${type?.name} (${c.harvestDate})`,
                 weight: netWeight,
                 unitPrice: type?.wetPrice,
                 amount: netWeight * (type?.wetPrice || 0)
             });
        });

        const relatedDeliveries = farmerDeliveries.filter(d => d.paymentRunId === paymentRunId);
        relatedDeliveries.forEach(d => {
            const type = seaweedTypes.find(st => st.id === d.seaweedTypeId);
            grossDetails.push({
                 description: `Delivery: ${type?.name} (${d.date})`,
                 weight: d.totalWeightKg,
                 unitPrice: type?.dryPrice,
                 amount: d.totalWeightKg * (type?.dryPrice || 0)
             });
        });

        if (grossDetails.length === 0) {
             grossDetails.push({
                 description: "Manual Payment / Adjustment",
                 amount: payment.amount + relatedRepayments.reduce((sum, r) => sum + r.amount, 0)
             });
        }

        const deductions = relatedRepayments.map(r => ({
            description: r.notes || "Credit Repayment",
            amount: r.amount
        }));

        const totalGross = grossDetails.reduce((sum, item) => sum + item.amount, 0);
        const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

        setReceiptData({
            payment,
            farmer,
            siteName: site?.name || '',
            grossDetails,
            deductions,
            totalGross,
            totalDeductions,
            netPaid: payment.amount
        });
        setIsReceiptModalOpen(true);
    };
    
    // Updated fallback to satisfy strict display requirements
    const formatRecipient = (type: string, id: string) => {
        const key = `${type}-${id}`;
        const name = recipientMap.get(key);
        if (name) return name;
        
        // Remove ID display
        return <span className="text-gray-500 italic">{t('unknown')}</span>;
    }

    return (
        <Card title={t('paymentHistory')}>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <SortableHeader sortKey="date" label={t('paymentDate')} />
                            <SortableHeader sortKey="period" label={t('period')} />
                            <SortableHeader sortKey="recipientName" label={t('recipient')} />
                            <SortableHeader sortKey="recipientType" label={t('recipientType')} />
                            <th className="p-3 text-right">{t('amount')}</th>
                            <th className="p-3">{t('paymentMethod')}</th>
                            <th className="p-3">{t('paymentStatus')}</th>
                            <th className="p-3 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPayments.map(p => {
                            const isProcessing = processingIds.has(p.id);
                            return (
                            <tr key={p.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                <td className="p-3">{p.date}</td>
                                <td className="p-3">{formatPeriod(p.period, language, t)}</td>
                                <td className="p-3 font-semibold">{formatRecipient(p.recipientType, p.recipientId)}</td>
                                <td className="p-3">{t(`recipientType_${p.recipientType}`)}</td>
                                <td className="p-3 text-right">{formatCurrency(p.amount, settings.localization)}</td>
                                <td className="p-3">{t(`paymentMethod_${p.method}`)}</td>
                                <td className="p-3">
                                    {p.paymentStatus ? <StatusBadge status={p.paymentStatus} /> : '-'}
                                    {p.transactionId && <div className="text-xs text-gray-500 mt-1 truncate max-w-[100px]" title={p.transactionId}>{p.transactionId}</div>}
                                </td>
                                <td className="p-3 text-right">
                                     <div className="flex justify-end gap-2 items-center">
                                        {p.recipientType === RecipientType.FARMER && (
                                            <Button variant="ghost" onClick={() => handlePrintReceipt(p)} title={t('print')}>
                                                <Icon name="Printer" className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {p.method === 'mobile_money' && (p.paymentStatus === 'PENDING' || p.paymentStatus === 'FAILED') && (
                                            <Button 
                                                variant="primary" 
                                                className="!py-1 !px-2 text-xs" 
                                                onClick={() => handlePayNow(p)}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? <Icon name="Activity" className="w-3 h-3 animate-spin" /> : t('payNow')}
                                            </Button>
                                        )}
                                        <Button variant="ghost" onClick={() => handleOpenModal(p)}><Icon name="Settings" className="w-4 h-4" /></Button>
                                        <Button variant="danger" onClick={() => handleDeleteClick(p.id)}><Icon name="Trash2" className="w-4 h-4" /></Button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
            {isFormModalOpen && <MonthlyPaymentFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} payment={editingPayment} />}
            {isConfirmOpen && <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('confirmDeletePayment')} message={t('confirmDeletePaymentMessage')} />}
            
            {receiptData && (
                <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title={t('farmerReceipt')} widthClass="max-w-screen-md">
                    <PrintableFarmerReceipt data={receiptData} />
                </Modal>
            )}
        </Card>
    );
};

const PaymentRunSetup: React.FC<{ onPrepare: (config: RunConfig) => void }> = ({ onPrepare }) => {
    const { t } = useLocalization();
    const { sites, seaweedTypes } = useData();

    const [runConfig, setRunConfig] = useState<RunConfig>({
        periodName: '',
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        paymentType: 'farmer_wet',
        siteId: 'all',
        seaweedTypeId: 'all',
    });
    
    const showSeaweedTypeSelector = runConfig.paymentType.startsWith('farmer') || runConfig.paymentType === 'service_provider';

    return (
        <Card title={t('paymentRunSetup')}>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                <Input label={t('periodName')} value={runConfig.periodName} onChange={e => setRunConfig(p => ({...p, periodName: e.target.value}))} placeholder="e.g. July 2024 Payments" required />
                <Input label={t('startDate')} type="date" value={runConfig.startDate} onChange={e => setRunConfig(p => ({...p, startDate: e.target.value}))} required />
                <Input label={t('endDate')} type="date" value={runConfig.endDate} onChange={e => setRunConfig(p => ({...p, endDate: e.target.value}))} required />
                <Select label={t('paymentType')} value={runConfig.paymentType} onChange={e => setRunConfig(p => ({...p, paymentType: e.target.value as any}))}>
                    <option value="farmer_wet">{t('wetDeliveryPayment')}</option>
                    <option value="farmer_dry">{t('dryDeliveryPayment')}</option>
                    <option value="service_provider">{t('serviceProviderPayment')}</option>
                    <option value="employee_payroll">{t('employeePayroll')}</option>
                </Select>
                 <Select label={t('site')} value={runConfig.siteId} onChange={e => setRunConfig(p => ({...p, siteId: e.target.value}))}>
                    <option value="all">{t('allSites')}</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                {showSeaweedTypeSelector && (
                    <Select label={t('seaweedType')} value={runConfig.seaweedTypeId} onChange={e => setRunConfig(p => ({...p, seaweedTypeId: e.target.value}))}>
                        <option value="all">{t('allSeaweedTypes')}</option>
                        {seaweedTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                )}
            </div>
            <div className="mt-6">
                <Button onClick={() => onPrepare(runConfig)} disabled={!runConfig.periodName || !runConfig.startDate || !runConfig.endDate}>
                    {t('preparePaymentRun')}
                </Button>
            </div>
        </Card>
    );
};

const DocumentPayments: React.FC = () => {
    const { t } = useLocalization();
    const [step, setStep] = useState<'setup' | 'review'>('setup');
    const [runConfig, setRunConfig] = useState<RunConfig | null>(null);

    const handlePrepare = (config: RunConfig) => {
        setRunConfig(config);
        setStep('review');
    };
    
    const handleCancel = () => {
        setRunConfig(null);
        setStep('setup');
    };
    
    const handleSuccess = () => {
        alert(t('paymentsRecordedSuccess'));
        setRunConfig(null);
        setStep('setup');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">{t('documentPaymentsTitle')}</h1>
            
            {step === 'setup' && <PaymentRunSetup onPrepare={handlePrepare} />}
            {step === 'review' && runConfig && <PaymentReview onCancel={handleCancel} onConfirmSuccess={handleSuccess} config={runConfig} />}

            <div className="mt-8">
                <PaymentHistory />
            </div>
        </div>
    );
};

export default DocumentPayments;
