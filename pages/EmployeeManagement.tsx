
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Employee, EmployeeType } from '../types';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import EmployeeProfileModal from '../components/EmployeeProfileModal';
import Checkbox from '../components/ui/Checkbox';
import AssignSiteModal from '../components/AssignSiteModal';
import Pagination from '../components/ui/Pagination';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency, parseNumber } from '../utils/formatters';

interface EmployeeFormProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
    onSave: (data: Omit<Employee, 'id'>) => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ isOpen, onClose, employee, onSave }) => {
    const { t } = useLocalization();
    const { sites, roles } = useData();
    const { settings } = useSettings();
    const [isWageFocused, setIsWageFocused] = useState(false);

    const initialFormData = useMemo(() => ({
        firstName: '', lastName: '', employeeType: 'PERMANENT' as EmployeeType, role: '', team: '', phone: '', email: '', 
        hireDate: new Date().toISOString().split('T')[0], 
        siteId: '',
        grossWage: '',
        category: ''
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const [employeeCode, setEmployeeCode] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = useCallback((data: typeof formData) => {
        const newErrors: Record<string, string> = {};
        if (!data.firstName.trim()) newErrors.firstName = t('validationRequired');
        if (!data.lastName.trim()) newErrors.lastName = t('validationRequired');
        if (!data.role.trim()) newErrors.role = t('validationRequired');
        if (!data.category.trim()) newErrors.category = t('validationRequired');
        if (!data.hireDate) newErrors.hireDate = t('validationRequired');
        if (!data.phone.trim()) newErrors.phone = t('validationRequired');
        
        const wage = typeof data.grossWage === 'string' ? parseNumber(data.grossWage, settings.localization) : data.grossWage;
        if (isNaN(wage) || wage <= 0) {
            newErrors.grossWage = t('validationPositiveNumber');
        }
        if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
            newErrors.email = t('validationEmail');
        }
        return newErrors;
    }, [t, settings.localization]);

    useEffect(() => {
        if (employee) {
            const { code, id, ...rest } = employee;
            setFormData({
                ...rest,
                team: rest.team || '',
                siteId: rest.siteId || '',
                grossWage: String(rest.grossWage)
            });
            setEmployeeCode(code);
        } else {
            setFormData(initialFormData);
            setEmployeeCode('');
        }
    }, [employee, initialFormData, isOpen]);
    
    useEffect(() => {
        if (!employee && formData.firstName && formData.lastName) {
            const code = (formData.firstName.substring(0, 1) + formData.lastName.substring(0, 2)).toUpperCase();
            setEmployeeCode(code);
        }
    }, [formData.firstName, formData.lastName, employee]);

    useEffect(() => {
        setErrors(validate(formData));
    }, [formData, validate]);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        onSave({
            ...formData,
            code: employeeCode,
            siteId: formData.siteId || undefined,
            team: formData.team || undefined,
            grossWage: typeof formData.grossWage === 'string' ? parseNumber(formData.grossWage, settings.localization) : formData.grossWage,
        });
    };
    
    const isFormInvalid = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? t('editEmployee') : t('addEmployee')} widthClass="max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label={t('firstName')} value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} error={errors.firstName} required autoFocus />
                    <Input label={t('lastName')} value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} error={errors.lastName} required />
                    <Input label={t('code')} value={employeeCode} disabled />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select label={t('employeeType')} value={formData.employeeType} onChange={e => handleChange('employeeType', e.target.value as EmployeeType)}>
                        <option value="PERMANENT">{t('employeeType_PERMANENT')}</option>
                        <option value="CASUAL">{t('employeeType_CASUAL')}</option>
                    </Select>
                    <Select label={t('role')} value={formData.role} onChange={e => handleChange('role', e.target.value)} error={errors.role} required>
                        <option value="">{t('selectRole')}</option>
                        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </Select>
                    <Input label={`${t('team')} (${t('optional')})`} value={formData.team} onChange={e => handleChange('team', e.target.value)} />
                    <Input
                        label={t('grossWage')}
                        type={isWageFocused ? 'number' : 'text'}
                        value={isWageFocused ? formData.grossWage : formatCurrency(parseFloat(formData.grossWage) || 0, settings.localization)}
                        onFocus={() => setIsWageFocused(true)}
                        onChange={e => handleChange('grossWage', e.target.value)}
                        onBlur={() => setIsWageFocused(false)}
                        error={errors.grossWage}
                        required
                    />
                     <Select label={t('site')} value={formData.siteId} onChange={e => handleChange('siteId', e.target.value)}>
                        <option value="">{t('noSpecificSite')}</option>
                        {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                    </Select>
                    <Input label={t('category')} value={formData.category} onChange={e => handleChange('category', e.target.value)} error={errors.category} required/>
                    <Input label={`${t('email')} (${t('optional')})`} type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                    <Input label={t('phone')} type="tel" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} required error={errors.phone}/>
                    <Input label={t('hireDate')} type="date" value={formData.hireDate} onChange={e => handleChange('hireDate', e.target.value)} error={errors.hireDate} required />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isFormInvalid}>{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

const EmployeeManagement: React.FC = () => {
    const { employees, sites, addEmployee, updateEmployee, deleteEmployee, deleteMultipleEmployees, updateEmployeesSite, roles } = useData();
    const { t } = useLocalization();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Employee | 'siteName'; direction: 'ascending' | 'descending' }>({ key: 'code', direction: 'ascending' });
    const [filters, setFilters] = useState({ name: '', siteId: 'all', role: 'all' });
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [isAssignSiteModalOpen, setIsAssignSiteModalOpen] = useState(false);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const siteMap = useMemo(() => new Map(sites.map(site => [site.id, site.name])), [sites]);
    const uniqueRoles = useMemo(() => [...new Set(employees.map(e => e.role).filter(Boolean))].sort(), [employees]);
    
    const filteredAndSortedEmployees = useMemo(() => {
        let filtered = [...employees];

        // Apply filters
        if (filters.name) {
            const searchLower = filters.name.toLowerCase();
            filtered = filtered.filter(e => 
                `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchLower) ||
                e.code.toLowerCase().includes(searchLower)
            );
        }
        if (filters.siteId !== 'all') {
            filtered = filtered.filter(e => e.siteId === filters.siteId);
        }
        if (filters.role !== 'all') {
            filtered = filtered.filter(e => e.role === filters.role);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let valA, valB;
            if (sortConfig.key === 'siteName') {
                valA = a.siteId ? siteMap.get(a.siteId) || '' : '';
                valB = b.siteId ? siteMap.get(b.siteId) || '' : '';
            } else {
                valA = a[sortConfig.key as keyof Employee] || '';
                valB = b[sortConfig.key as keyof Employee] || '';
            }

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [employees, filters, sortConfig, siteMap]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters.name, filters.siteId, filters.role, itemsPerPage]);

    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedEmployees.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedEmployees, currentPage, itemsPerPage]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const currentPageIds = new Set(paginatedEmployees.map(e => e.id));
            const selectedOnPageCount = selectedEmployees.filter(id => currentPageIds.has(id)).length;
            const allOnPageSelected = selectedOnPageCount === paginatedEmployees.length && paginatedEmployees.length > 0;
            
            selectAllCheckboxRef.current.checked = allOnPageSelected;
            selectAllCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && !allOnPageSelected;
        }
    }, [selectedEmployees, paginatedEmployees]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ name: '', siteId: 'all', role: 'all' });
    };

    const requestSort = (key: keyof Employee | 'siteName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: keyof Employee | 'siteName') => {
        if (sortConfig.key !== key) {
            return <Icon name="ChevronDown" className="w-4 h-4 text-transparent group-hover:text-gray-400 transition-colors" />;
        }
        return sortConfig.direction === 'ascending' ? <Icon name="ArrowUp" className="w-4 h-4" /> : <Icon name="ArrowDown" className="w-4 h-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: keyof Employee | 'siteName'; label: string; }> = ({ sortKey, label }) => (
        <th className="p-3">
            <button onClick={() => requestSort(sortKey)} className="group flex items-center gap-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                {label}
                {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const handleOpenModal = (employee: Employee | null = null) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingEmployee(null);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (employeeId: string) => {
        setEmployeeToDelete(employeeId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (employeeToDelete) {
            deleteEmployee(employeeToDelete);
        }
        setIsConfirmOpen(false);
        setEmployeeToDelete(null);
    };
    
    const handleSave = (employeeData: Omit<Employee, 'id'>) => {
        if (editingEmployee) {
            updateEmployee({ ...editingEmployee, ...employeeData });
        } else {
            addEmployee(employeeData);
        }
        handleCloseModal();
    };
    
    const handleViewProfile = (employee: Employee) => {
        setSelectedEmployee(employee);
    };
    
    const handleCloseProfileModal = () => {
        setSelectedEmployee(null);
    };
    
    const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const currentPageIds = paginatedEmployees.map(emp => emp.id);
        if (e.target.checked) {
            setSelectedEmployees(prev => [...new Set([...prev, ...currentPageIds])]);
        } else {
            const currentPageIdSet = new Set(currentPageIds);
            setSelectedEmployees(prev => prev.filter(id => !currentPageIdSet.has(id)));
        }
    }, [paginatedEmployees]);

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, employeeId: string) => {
        if (e.target.checked) {
            setSelectedEmployees(prev => [...prev, employeeId]);
        } else {
            setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
        }
    };
    
    const handleBulkDeleteClick = () => {
        setIsBulkConfirmOpen(true);
    };

    const handleConfirmBulkDelete = () => {
        deleteMultipleEmployees(selectedEmployees);
        setSelectedEmployees([]);
        setIsBulkConfirmOpen(false);
    };

    const handleAssignSite = (siteId: string) => {
        updateEmployeesSite(selectedEmployees, siteId);
        setSelectedEmployees([]);
        setIsAssignSiteModalOpen(false);
    };


    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{t('employeeManagementTitle')}</h1>
                <Button onClick={() => handleOpenModal()}>
                    <Icon name="PlusCircle" className="w-5 h-5"/>
                    {t('addEmployee')}
                </Button>
            </div>

            <Card className="mb-6" title={t('filtersTitle')}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input 
                        label={t('searchByNameOrCode')}
                        value={filters.name}
                        onChange={e => handleFilterChange('name', e.target.value)}
                        placeholder={t('searchByNameOrCode')}
                    />
                    <Select
                        label={t('site')}
                        value={filters.siteId}
                        onChange={e => handleFilterChange('siteId', e.target.value)}
                    >
                        <option value="all">{t('allSites')}</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select
                        label={t('role')}
                        value={filters.role}
                        onChange={e => handleFilterChange('role', e.target.value)}
                    >
                        <option value="all">{t('allRoles')}</option>
                        {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <Button variant="secondary" onClick={clearFilters} className="h-[42px]">
                        {t('clearFilters')}
                    </Button>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="p-3 w-4">
                                     <Checkbox
                                        ref={selectAllCheckboxRef}
                                        onChange={handleSelectAll}
                                        aria-label={t('selectAllEmployees')}
                                    />
                                </th>
                                <SortableHeader sortKey="code" label={t('code')} />
                                <SortableHeader sortKey="firstName" label={t('firstName')} />
                                <SortableHeader sortKey="lastName" label={t('lastName')} />
                                <SortableHeader sortKey="role" label={t('role')} />
                                <SortableHeader sortKey="team" label={t('team')} />
                                <SortableHeader sortKey="siteName" label={t('site')} />
                                <SortableHeader sortKey="phone" label={t('phone')} />
                                <SortableHeader sortKey="hireDate" label={t('hireDate')} />
                                <th className="p-3 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedEmployees.map(employee => (
                                <tr key={employee.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                    <td className="p-3">
                                        <Checkbox
                                            checked={selectedEmployees.includes(employee.id)}
                                            onChange={(e) => handleSelectOne(e, employee.id)}
                                            aria-label={t('selectEmployeeNamed').replace('{name}', `${employee.firstName} ${employee.lastName}`)}
                                        />
                                    </td>
                                    <td className="p-3 font-mono">{employee.code}</td>
                                    <td className="p-3 font-semibold">
                                        <button onClick={() => handleViewProfile(employee)} className="text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer text-left">
                                            {employee.firstName}
                                        </button>
                                    </td>
                                    <td className="p-3 font-semibold">{employee.lastName}</td>
                                    <td className="p-3">{employee.role}</td>
                                    <td className="p-3">{employee.team || t('none')}</td>
                                    <td className="p-3">
                                        {employee.siteId 
                                            ? (siteMap.get(employee.siteId) || t('unknown'))
                                            : t('noSpecificSite')
                                        }
                                    </td>
                                    <td className="p-3">{employee.phone}</td>
                                    <td className="p-3">{employee.hireDate}</td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => handleOpenModal(employee)}><Icon name="Settings" className="w-4 h-4" />{t('edit')}</Button>
                                            <Button variant="danger" onClick={() => handleDeleteClick(employee.id)}><Icon name="Trash2" className="w-4 h-4" />{t('delete')}</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredAndSortedEmployees.length === 0 && (
                    <p className="text-center p-8 text-gray-500">{t('noEmployeesMatchFilters')}</p>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredAndSortedEmployees.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredAndSortedEmployees.length}
                    onItemsPerPageChange={(value) => {
                        setItemsPerPage(value);
                        setCurrentPage(1);
                    }}
                />
            </Card>

             {selectedEmployees.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 z-20 md:ml-16">
                    <span className="font-semibold">{t('itemsSelected').replace('{count}', String(selectedEmployees.length))}</span>
                    <Button onClick={() => setIsAssignSiteModalOpen(true)}>
                        <Icon name="MapPin" className="w-4 h-4" />
                        {t('assignSite')}
                    </Button>
                    <Button variant="danger" onClick={handleBulkDeleteClick}>
                        <Icon name="Trash2" className="w-4 h-4" />
                        {t('deleteSelected')}
                    </Button>
                </div>
            )}

            {isModalOpen && (
                <EmployeeForm
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    employee={editingEmployee}
                    onSave={handleSave}
                />
            )}

            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeleteEmployee')}
                />
            )}
            
            {isBulkConfirmOpen && (
                 <ConfirmationModal
                    isOpen={isBulkConfirmOpen}
                    onClose={() => setIsBulkConfirmOpen(false)}
                    onConfirm={handleConfirmBulkDelete}
                    title={t('confirmBulkDeleteTitle')}
                    message={t('confirmBulkDeleteEmployees').replace('{count}', String(selectedEmployees.length))}
                />
            )}

            {isAssignSiteModalOpen && (
                <AssignSiteModal
                    isOpen={isAssignSiteModalOpen}
                    onClose={() => setIsAssignSiteModalOpen(false)}
                    onAssign={handleAssignSite}
                    sites={sites}
                    selectedCount={selectedEmployees.length}
                />
            )}

            {selectedEmployee && <EmployeeProfileModal isOpen={!!selectedEmployee} onClose={handleCloseProfileModal} employee={selectedEmployee} />}
        </div>
    );
};

export default EmployeeManagement;
