
// src/pages/PayrollCalculator.tsx
import React, { useState, useMemo, FC, useCallback, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import { formatCurrency } from '../utils/formatters';
import type { Employee, Site, MonthlyPayment } from '../types';
import { RecipientType } from '../types';
import Icon from '../components/ui/Icon';
import { calculatePayroll, type PayrollCalculationResult } from '../utils/payroll';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { COUNTRIES } from '../constants';

type PayrollInput = { bonuses: string; overtime: string; other: string };
type ProcessedPayroll = PayrollCalculationResult & { employee: Employee; inputs: PayrollInput; appliedDeductions: string[] };

const DeductionControlPopover: FC<{
    employeeId: string;
    appliedDeductions: string[];
    onToggle: (employeeId: string, key: string, isEnabled: boolean) => void;
}> = ({ employeeId, appliedDeductions, onToggle }) => {
    const { settings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const payrollConfig = useMemo(() => COUNTRIES.find(c => c.code === settings.localization.country)?.payroll || COUNTRIES.find(c => c.code === 'MG')!.payroll, [settings.localization.country]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={popoverRef} className="relative inline-flex">
            <Button variant="ghost" className="p-1 !rounded-full" onClick={() => setIsOpen(!isOpen)}>
                <Icon name="Settings" className="w-4 h-4" />
            </Button>
            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 z-10 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 p-2 space-y-2">
                    {payrollConfig.constants.socialContributions.map(sc => (
                        <label key={sc.key} className="flex items-center text-sm cursor-pointer">
                            <Checkbox 
                                checked={appliedDeductions.includes(sc.key)}
                                onChange={e => onToggle(employeeId, sc.key, e.target.checked)}
                            />
                            <span className="ml-2">{payrollConfig.labels.socialContributions.find(l => l.key === sc.key)?.label || sc.key}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

type BulkConfig = {
    applyTo: 'all' | 'site' | 'role';
    filterValue: string;
    action: 'set' | 'add';
    values: { bonuses: string; overtime: string; other: string; };
    configureSocialDeductions: boolean;
    deductionsToApply: Record<string, boolean>;
    showAffectedEmployees: boolean;
};

interface BulkConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (config: BulkConfig) => void;
    sites: Site[];
    roles: string[];
    payrollConfig: any;
}

const BulkConfigModal: FC<BulkConfigModalProps> = ({ isOpen, onClose, onApply, sites, roles, payrollConfig }) => {
    const { t } = useLocalization();
    const [config, setConfig] = useState<BulkConfig>({
        applyTo: 'all', filterValue: '', action: 'set',
        values: { bonuses: '', overtime: '', other: '' },
        configureSocialDeductions: false, deductionsToApply: {},
        showAffectedEmployees: true,
    });
    
    useEffect(() => {
        if (isOpen) {
            const initialDeductions = payrollConfig.constants.socialContributions.reduce((acc: any, sc: any) => {
                acc[sc.key] = true;
                return acc;
            }, {});
            setConfig(prev => ({ ...prev, filterValue: '', deductionsToApply: initialDeductions }));
        }
    }, [isOpen, payrollConfig]);

    const handleApplyClick = () => {
        onApply(config);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('bulkConfigure')} footer={
            <>
                <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={handleApplyClick}>{t('applyChanges')}</Button>
            </>
        }>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label={t('applyTo')} value={config.applyTo} onChange={e => setConfig(p => ({...p, applyTo: e.target.value as any}))}>
                        <option value="all">{t('allSelectedEmployees')}</option>
                        <option value="site">{t('bySite')}</option>
                        <option value="role">{t('byRole')}</option>
                    </Select>
                    {config.applyTo === 'site' && <Select label={t('site')} value={config.filterValue} onChange={e => setConfig(p => ({...p, filterValue: e.target.value}))}><option value="">{t('selectSite')}</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>}
                    {config.applyTo === 'role' && <Select label={t('role')} value={config.filterValue} onChange={e => setConfig(p => ({...p, filterValue: e.target.value}))}><option value="">{t('selectRole')}</option>{roles.map(r => <option key={r} value={r}>{r}</option>)}</Select>}
                </div>

                <div className="border-t pt-4">
                    <Select label={'Action'} value={config.action} onChange={e => setConfig(p => ({...p, action: e.target.value as any}))}>
                        <option value="set">{t('setValue')}</option>
                        <option value="add">{t('addToExisting')}</option>
                    </Select>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <Input label={t('bonuses')} type="number" placeholder={t('optional')} value={config.values.bonuses} onChange={e => setConfig(p => ({...p, values: {...p.values, bonuses: e.target.value}}))} />
                        <Input label={t('overtime')} type="number" placeholder={t('optional')} value={config.values.overtime} onChange={e => setConfig(p => ({...p, values: {...p.values, overtime: e.target.value}}))} />
                        <Input label={t('otherDeductions')} type="number" placeholder={t('optional')} value={config.values.other} onChange={e => setConfig(p => ({...p, values: {...p.values, other: e.target.value}}))} />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <label className="flex items-center space-x-2 font-semibold"><Checkbox checked={config.configureSocialDeductions} onChange={e => setConfig(p => ({ ...p, configureSocialDeductions: e.target.checked }))} /><span>{t('configureSocialDeductions')}</span></label>
                    {config.configureSocialDeductions && (
                        <div className="pl-6 mt-2 space-y-2">
                            {payrollConfig.constants.socialContributions.map((sc: any) => (
                                 <label key={sc.key} className="flex items-center text-sm"><Checkbox checked={config.deductionsToApply[sc.key] ?? false} onChange={e => setConfig(p => ({...p, deductionsToApply: {...p.deductionsToApply, [sc.key]: e.target.checked}}))} /><span className="ml-2">{payrollConfig.labels.socialContributions.find((l: any) => l.key === sc.key)?.label || sc.key}</span></label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="border-t pt-4">
                     <label className="flex items-center space-x-2"><Checkbox checked={config.showAffectedEmployees} onChange={e => setConfig(p => ({ ...p, showAffectedEmployees: e.target.checked }))} /><span>{t('showAffectedEmployeesAfterUpdate')}</span></label>
                </div>
            </div>
        </Modal>
    );
};

const AffectedEmployeesModal: FC<{isOpen: boolean; onClose: () => void; employeeNames: string[]}> = ({ isOpen, onClose, employeeNames }) => {
    const { t } = useLocalization();
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('bulkUpdateSummary')} footer={<Button onClick={onClose}>{t('close')}</Button>}>
            <p className="mb-4">{t('affectedEmployees').replace('{count}', String(employeeNames.length))}</p>
            <div className="max-h-60 overflow-y-auto bg-gray-100 dark:bg-gray-800/50 p-3 rounded-md">
                <ul className="list-disc list-inside">
                    {employeeNames.map(name => <li key={name}>{name}</li>)}
                </ul>
            </div>
        </Modal>
    );
}

const PayrollCalculator: FC = () => {
    const { t } = useLocalization();
    const { employees, sites, addMultipleMonthlyPayments } = useData();
    const { settings } = useSettings();
    
    const [month, setMonth] = useState<number>(new Date().getMonth());
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [siteFilter, setSiteFilter] = useState<string>('all');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set<string>());
    const [processedPayrolls, setProcessedPayrolls] = useState<ProcessedPayroll[]>([]);
    const [expandedRows, setExpandedRows] = useState(new Set<string>());
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const [isBulkConfigModalOpen, setIsBulkConfigModalOpen] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [affectedEmployees, setAffectedEmployees] = useState<string[] | null>(null);

    const years = useMemo(() => Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i), []);
    const monthKeys = useMemo(() => ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'], []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
    const periodForDisplay = `${t(monthKeys[month] as any)} ${year}`;

    const payrollConfig = useMemo(() => {
        return COUNTRIES.find(c => c.code === settings.localization.country)?.payroll || COUNTRIES.find(c => c.code === 'MG')!.payroll;
    }, [settings.localization.country]);

    const filteredEmployees = useMemo(() => {
        const periodEndDate = new Date(year, month + 1, 0);
        
        let result = employees.filter(e => {
            if (!e.hireDate) return false;
            const hireDate = new Date(e.hireDate);
            return !isNaN(hireDate.getTime()) && hireDate <= periodEndDate;
        });

        if (siteFilter === 'all') return result;
        return result.filter(e => e.siteId === siteFilter);
    }, [employees, siteFilter, year, month]);

    const handleSelectOne = (employeeId: string) => {
        setSelectedEmployeeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedEmployeeIds(new Set(filteredEmployees.map(e => e.id)));
        } else {
            setSelectedEmployeeIds(new Set());
        }
    };

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numSelected = selectedEmployeeIds.size;
            const numVisible = filteredEmployees.length;
            selectAllCheckboxRef.current.checked = numSelected === numVisible && numVisible > 0;
            selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numVisible;
        }
    }, [selectedEmployeeIds, filteredEmployees]);

    const recalculatePayroll = (payroll: ProcessedPayroll): ProcessedPayroll => {
        const bonuses = parseFloat(payroll.inputs.bonuses) || 0;
        const overtime = parseFloat(payroll.inputs.overtime) || 0;
        const other = parseFloat(payroll.inputs.other) || 0;
        const newCalculation = calculatePayroll(
            payroll.employee.grossWage,
            bonuses,
            overtime,
            other,
            settings.localization,
            { appliedDeductions: payroll.appliedDeductions }
        );
        return { ...newCalculation, employee: payroll.employee, inputs: payroll.inputs, appliedDeductions: payroll.appliedDeductions };
    };

    const handleCalculate = () => {
        const selectedEmployees = employees.filter(e => selectedEmployeeIds.has(e.id));
        const allDeductionKeys = payrollConfig ? payrollConfig.constants.socialContributions.map(sc => sc.key) : [];
        
        const results = selectedEmployees.map(employee => {
            const inputs = { bonuses: '0', overtime: '0', other: '0' };
            const calculation = calculatePayroll(employee.grossWage, 0, 0, 0, settings.localization, { appliedDeductions: allDeductionKeys });
            return { ...calculation, employee, inputs, appliedDeductions: allDeductionKeys };
        });
        setProcessedPayrolls(results);
        setExpandedRows(new Set());
    };

    const handleInputChange = (employeeId: string, field: keyof PayrollInput, value: string) => {
        setProcessedPayrolls(prev => prev.map(p => {
            if (p.employee.id === employeeId) {
                const newP = { ...p, inputs: { ...p.inputs, [field]: value } };
                return recalculatePayroll(newP);
            }
            return p;
        }));
    };

    const handleToggleIndividualDeduction = (employeeId: string, deductionKey: string, isEnabled: boolean) => {
        setProcessedPayrolls(prev => prev.map(p => {
            if (p.employee.id === employeeId) {
                const currentDeductions = new Set(p.appliedDeductions);
                if (isEnabled) {
                    currentDeductions.add(deductionKey);
                } else {
                    currentDeductions.delete(deductionKey);
                }
                const newP = { ...p, appliedDeductions: Array.from(currentDeductions) };
                return recalculatePayroll(newP);
            }
            return p;
        }));
    };

    const handleBulkApply = (config: BulkConfig) => {
        const affectedNames: string[] = [];

        setProcessedPayrolls(prevPayrolls => 
            prevPayrolls.map(p => {
                const employee = p.employee;
                let shouldApply = false;
                
                switch (config.applyTo) {
                    case 'all': shouldApply = true; break;
                    case 'site': shouldApply = employee.siteId === config.filterValue; break;
                    case 'role': shouldApply = employee.role === config.filterValue; break;
                }

                if (shouldApply) {
                    affectedNames.push(`${employee.firstName} ${employee.lastName}`);
                    
                    let newInputs = { ...p.inputs };
                    let newAppliedDeductions = [...p.appliedDeductions];

                    ['bonuses', 'overtime', 'other'].forEach(key => {
                        const field = key as keyof PayrollInput;
                        if (config.values[field]) {
                            const configValue = parseFloat(config.values[field]) || 0;
                            const currentValue = parseFloat(newInputs[field]) || 0;
                            const finalValue = config.action === 'add' ? currentValue + configValue : configValue;
                            newInputs[field] = String(finalValue);
                        }
                    });

                    if (config.configureSocialDeductions) {
                        newAppliedDeductions = Object.entries(config.deductionsToApply)
                            .filter(([, isApplied]) => isApplied)
                            .map(([key]) => key);
                    }

                    const bonuses = parseFloat(newInputs.bonuses) || 0;
                    const overtime = parseFloat(newInputs.overtime) || 0;
                    const other = parseFloat(newInputs.other) || 0;

                    const newCalculation = calculatePayroll(
                        employee.grossWage, bonuses, overtime, other, settings.localization, 
                        { appliedDeductions: newAppliedDeductions }
                    );
                    
                    return { ...newCalculation, employee, inputs: newInputs, appliedDeductions: newAppliedDeductions };
                }
                
                return p;
            })
        );
        setIsBulkConfigModalOpen(false);
        if (config.showAffectedEmployees) {
            setAffectedEmployees(affectedNames);
        } else {
            setAffectedEmployees(null);
        }
    };

    const handleConfirmSave = () => {
        const periodFormatted = `${year}-${String(month + 1).padStart(2, '0')}`;
        const date = new Date().toISOString().split('T')[0];
        const runId = `payroll-${Date.now()}`;

        const newPayments: Omit<MonthlyPayment, 'id'>[] = processedPayrolls.map(p => ({
            date: date,
            period: periodFormatted,
            recipientType: RecipientType.EMPLOYEE,
            recipientId: p.employee.id,
            amount: p.netPay,
            method: 'cash',
            notes: JSON.stringify({
                 type: 'payroll_run',
                 details: {
                     gross: p.totalGross,
                     base: p.baseSalary,
                     bonuses: p.inputs.bonuses,
                     overtime: p.inputs.overtime,
                     deductions: p.totalDeductions,
                     otherDeductions: p.inputs.other
                 }
            }),
            paymentRunId: runId,
            paymentStatus: 'PENDING'
        }));

        addMultipleMonthlyPayments(newPayments);
        setIsSaveConfirmOpen(false);
        alert(t('payrollSavedSuccess'));
    };
    
    const toggleRowExpansion = (employeeId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    const summary = useMemo(() => {
        return processedPayrolls.reduce((acc, p) => ({
            totalGross: acc.totalGross + p.totalGross,
            totalDeductions: acc.totalDeductions + p.totalDeductions,
            totalNet: acc.totalNet + p.netPay,
        }), { totalGross: 0, totalDeductions: 0, totalNet: 0 });
    }, [processedPayrolls]);
    
    const { uniqueSites, uniqueRoles } = useMemo(() => {
        const siteIds = new Set<string>();
        const roles = new Set<string>();
        processedPayrolls.forEach(p => {
            if (p.employee.siteId) siteIds.add(p.employee.siteId);
            if (p.employee.role) roles.add(p.employee.role);
        });
        const uniqueSites = sites.filter(s => siteIds.has(s.id));
        const uniqueRoles = Array.from(roles).sort();
        return { uniqueSites, uniqueRoles };
    }, [processedPayrolls, sites]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">{t('payrollCalculator')}</h1>

            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('period')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                                {months.map(m => <option key={m} value={m}>{t(monthKeys[m] as any)}</option>)}
                            </Select>
                            <Select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </Select>
                        </div>
                    </div>
                    <Select label={t('filterBySite')} value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                        <option value="all">{t('allSites')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                </div>
            </Card>

            <Card title={t('employeeSelection')}>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('selectEmployeesAndCalculate')}</p>
                <div className="max-h-96 overflow-y-auto border dark:border-gray-700 rounded-lg">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm">
                            <tr className="border-b dark:border-gray-700">
                                <th className="p-3 w-4"><Checkbox ref={selectAllCheckboxRef} onChange={handleSelectAll} aria-label={t('selectAllEmployees')} /></th>
                                <th className="p-3">{t('name')}</th>
                                <th className="p-3">{t('site')}</th>
                                <th className="p-3">{t('role')}</th>
                                <th className="p-3 text-right">{t('grossWage')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length > 0 ? filteredEmployees.map(employee => (
                                <tr key={employee.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                    <td className="p-3"><Checkbox checked={selectedEmployeeIds.has(employee.id)} onChange={() => handleSelectOne(employee.id)} /></td>
                                    <td className="p-3 font-semibold">{employee.firstName} {employee.lastName}</td>
                                    <td className="p-3">{sites.find(s => s.id === employee.siteId)?.name || 'N/A'}</td>
                                    <td className="p-3">{employee.role}</td>
                                    <td className="p-3 text-right">{formatCurrency(employee.grossWage, settings.localization)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="text-center p-4 text-gray-500">{t('noEmployeesMatchFilters')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4">
                    <Button onClick={handleCalculate} disabled={selectedEmployeeIds.size === 0}>
                        <Icon name="Calculator" className="w-5 h-5" />
                        {t('processPayrollFor').replace('{count}', String(selectedEmployeeIds.size))}
                    </Button>
                </div>
            </Card>

            {processedPayrolls.length > 0 && (
                <Card className="mt-6" title={t('payrollResults')}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">{t('payrollSummaryForPeriod').replace('{period}', periodForDisplay)}</h3>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsBulkConfigModalOpen(true)}>
                                <Icon name="Settings" className="w-4 h-4" />
                                {t('bulkConfigure')}
                            </Button>
                            <Button onClick={() => setIsSaveConfirmOpen(true)}>
                                <Icon name="Save" className="w-4 h-4" />
                                {t('save')}
                            </Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500">{t('totalGrossPay')}</p>
                            <p className="text-2xl font-bold">{formatCurrency(summary.totalGross, settings.localization)}</p>
                        </div>
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500">{t('totalAllDeductions')}</p>
                            <p className="text-2xl font-bold">{formatCurrency(summary.totalDeductions, settings.localization)}</p>
                        </div>
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200">{t('totalNetPay')}</p>
                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(summary.totalNet, settings.localization)}</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b dark:border-gray-700">
                                    <th className="p-3 w-12"></th>
                                    <th className="p-3 min-w-[150px]">{t('employee')}</th>
                                    <th className="p-3 w-28 text-center">{t('socialDeductions')}</th>
                                    <th className="p-3 text-right">{t('grossSalary')}</th>
                                    <th className="p-3 w-32 text-right">{t('bonuses')}</th>
                                    <th className="p-3 w-32 text-right">{t('overtime')}</th>
                                    <th className="p-3 w-32 text-right">{t('otherDeductions')}</th>
                                    <th className="p-3 text-right font-semibold">{t('totalGross')}</th>
                                    <th className="p-3 text-right font-semibold">{t('payrollTotalDeductions')}</th>
                                    <th className="p-3 text-right font-bold text-lg">{t('netPay')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedPayrolls.map(p => {
                                    const isExpanded = expandedRows.has(p.employee.id);
                                    return (
                                        <React.Fragment key={p.employee.id}>
                                            <tr className="border-b dark:border-gray-700/50 align-middle">
                                                <td className="p-3 text-center">
                                                    <Button variant="ghost" className="p-1 !rounded-full" onClick={() => toggleRowExpansion(p.employee.id)}>
                                                        <Icon name="ChevronRight" className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    </Button>
                                                </td>
                                                <td className="p-3 font-semibold">{p.employee.firstName} {p.employee.lastName}</td>
                                                <td className="p-3 text-center">
                                                    <DeductionControlPopover 
                                                        employeeId={p.employee.id} 
                                                        appliedDeductions={p.appliedDeductions}
                                                        onToggle={handleToggleIndividualDeduction}
                                                    />
                                                </td>
                                                <td className="p-3 text-right">{formatCurrency(p.baseSalary, settings.localization)}</td>
                                                <td><Input type="number" value={p.inputs.bonuses} onChange={e => handleInputChange(p.employee.id, 'bonuses', e.target.value)} containerClassName="w-full" className="text-right" /></td>
                                                <td><Input type="number" value={p.inputs.overtime} onChange={e => handleInputChange(p.employee.id, 'overtime', e.target.value)} containerClassName="w-full" className="text-right" /></td>
                                                <td><Input type="number" value={p.inputs.other} onChange={e => handleInputChange(p.employee.id, 'other', e.target.value)} containerClassName="w-full" className="text-right" /></td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(p.totalGross, settings.localization)}</td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(p.totalDeductions, settings.localization)}</td>
                                                <td className="p-3 text-right font-bold text-lg">{formatCurrency(p.netPay, settings.localization)}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-100/50 dark:bg-gray-900/50">
                                                    <td colSpan={10} className="p-4">
                                                        <h4 className="font-semibold text-md mb-2">{t('deductionDetails')}</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                                                            {p.deductions.map(d => (
                                                                <div key={d.label} className="flex justify-between text-xs">
                                                                    <span className="text-gray-500 dark:text-gray-400">{d.label}:</span>
                                                                    <span>{formatCurrency(d.amount, settings.localization)}</span>
                                                                </div>
                                                            ))}
                                                            {p.deductions.length === 0 && <span className="text-gray-500 text-xs">{t('noStatutoryDeductions')}</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
             <BulkConfigModal 
                isOpen={isBulkConfigModalOpen} 
                onClose={() => setIsBulkConfigModalOpen(false)}
                onApply={handleBulkApply}
                sites={uniqueSites}
                roles={uniqueRoles}
                payrollConfig={payrollConfig}
            />
            {affectedEmployees && (
                <AffectedEmployeesModal 
                    isOpen={!!affectedEmployees}
                    onClose={() => setAffectedEmployees(null)}
                    employeeNames={affectedEmployees}
                />
            )}
             {isSaveConfirmOpen && (
                <ConfirmationModal
                    isOpen={isSaveConfirmOpen}
                    onClose={() => setIsSaveConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                    title={t('confirmSavePayroll')}
                    message={t('confirmSavePayrollMessage')}
                    confirmText={t('save')}
                />
            )}
        </div>
    );
};

export default PayrollCalculator;
