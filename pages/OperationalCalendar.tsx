
import React, { useState, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import { ModuleStatus, IncidentStatus } from '../types';
import { CYCLE_DURATION_DAYS } from '../constants';
import StatusBadge from '../components/ui/StatusBadge';
import { exportDataToExcel } from '../utils/excelExporter';

// Define Event Types
interface CalendarEvent {
    id: string;
    date: Date;
    type: 'HARVEST' | 'PAYMENT' | 'INCIDENT' | 'TEST';
    title: string;
    details: React.ReactNode;
    colorClass: string;
}

// --- Date Utility Functions (Zero dependency) ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun)
};
const isSameDate = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

const OperationalCalendar: React.FC = () => {
    const { t, language } = useLocalization();
    const { cultivationCycles, monthlyPayments, incidents, periodicTests, modules, seaweedTypes, incidentTypes, sites } = useData();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [filters, setFilters] = useState({
        HARVEST: true,
        PAYMENT: true,
        INCIDENT: true,
        TEST: true
    });
    const [showFilters, setShowFilters] = useState(false);

    // --- Data Aggregation ---
    const events = useMemo(() => {
        const allEvents: CalendarEvent[] = [];

        // 1. Projected Harvests
        cultivationCycles.forEach(cycle => {
            if (cycle.status === ModuleStatus.PLANTED || cycle.status === ModuleStatus.GROWING) {
                const plantingDate = new Date(cycle.plantingDate);
                const projectedDate = new Date(plantingDate);
                projectedDate.setDate(plantingDate.getDate() + CYCLE_DURATION_DAYS);
                
                const module = modules.find(m => m.id === cycle.moduleId);
                const type = seaweedTypes.find(st => st.id === cycle.seaweedTypeId);

                allEvents.push({
                    id: `harvest-${cycle.id}`,
                    date: projectedDate,
                    type: 'HARVEST',
                    title: `${t('projectedHarvest')}: ${module?.code}`,
                    colorClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800',
                    details: (
                        <div className="space-y-2">
                            <p><strong>{t('module')}:</strong> {module?.code}</p>
                            <p><strong>{t('seaweedType')}:</strong> {type?.name}</p>
                            <p><strong>{t('plantingDate')}:</strong> {cycle.plantingDate}</p>
                            <p><strong>{t('initialWeight')}:</strong> {cycle.initialWeight} kg</p>
                            <p><strong>{t('status')}:</strong> <StatusBadge status={cycle.status} /></p>
                        </div>
                    )
                });
            }
        });

        // 2. Payments
        const processedRuns = new Set<string>();
        monthlyPayments.forEach(payment => {
            // Group by run or date to avoid clutter
            const key = payment.paymentRunId || payment.date;
            if (!processedRuns.has(key)) {
                processedRuns.add(key);
                 allEvents.push({
                    id: `pay-${payment.id}`,
                    date: new Date(payment.date),
                    type: 'PAYMENT',
                    title: `${t('paymentRun')}`,
                    colorClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
                    details: (
                        <div className="space-y-2">
                            <p><strong>{t('date')}:</strong> {payment.date}</p>
                            <p><strong>{t('period')}:</strong> {payment.period}</p>
                            <p className="text-sm text-gray-500">Details available in Document Payments.</p>
                        </div>
                    )
                });
            }
        });

        // 3. Incidents
        incidents.forEach(inc => {
            const typeName = incidentTypes.find(t => t.id === inc.type)?.name || inc.type;
            const siteName = sites.find(s => s.id === inc.siteId)?.name || 'Unknown Site';
            allEvents.push({
                id: `inc-${inc.id}`,
                date: new Date(inc.date),
                type: 'INCIDENT',
                title: `${t('incidentsLabel')}: ${typeName}`,
                colorClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800',
                details: (
                    <div className="space-y-2">
                        <p><strong>{t('site')}:</strong> {siteName}</p>
                        <p><strong>{t('type')}:</strong> {typeName}</p>
                        <p><strong>{t('severity')}:</strong> <StatusBadge status={inc.severity} /></p>
                        <p><strong>{t('status')}:</strong> <StatusBadge status={inc.status} /></p>
                        <p className="italic">"{inc.description}"</p>
                    </div>
                )
            });
        });

        // 4. Periodic Tests
        periodicTests.forEach(test => {
             const siteName = sites.find(s => s.id === test.siteId)?.name || 'Unknown Site';
             allEvents.push({
                id: `test-${test.id}`,
                date: new Date(test.date),
                type: 'TEST',
                title: `${t('periodicTest')}: ${test.identity}`,
                colorClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800',
                details: (
                     <div className="space-y-2">
                        <p><strong>{t('identity')}:</strong> {test.identity}</p>
                         <p><strong>{t('site')}:</strong> {siteName}</p>
                        <p><strong>{t('growthRate')}:</strong> {test.growthRate ? `${test.growthRate}%` : '-'}</p>
                    </div>
                )
             });
        });

        return allEvents.filter(e => filters[e.type]);
    }, [cultivationCycles, monthlyPayments, incidents, periodicTests, modules, seaweedTypes, incidentTypes, sites, t, filters]);


    // --- Calendar Navigation ---
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };
    
    // --- Export Logic ---
    const handleExportExcel = async () => {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const eventsToExport = events.filter(e => 
            e.date >= startOfMonth && e.date <= endOfMonth
        ).map(e => ({
            date: e.date.toLocaleDateString(language),
            type: e.type,
            title: e.title
        }));

        if (eventsToExport.length === 0) {
            alert(t('noDataForReport'));
            return;
        }

        await exportDataToExcel(
            eventsToExport,
            [
                { header: t('date'), key: 'date', width: 15 },
                { header: t('category'), key: 'type', width: 15 },
                { header: t('description'), key: 'title', width: 50 },
            ],
            `Calendar_${currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}`,
            'Calendar Events'
        );
    };

    // --- Calendar Grid Generation ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    
    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(null);
    }
    
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(year, month, i));
    }

    const monthName = currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' });
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => t(d as any));

    return (
        <div className="h-full flex flex-col">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="Calendar" className="w-8 h-8 text-blue-600" />
                    {t('operationalCalendarTitle')}
                </h1>
                
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleExportExcel} className="hidden sm:flex">
                        <Icon name="FileSpreadsheet" className="w-5 h-5 mr-2" />
                        {t('exportExcel')}
                    </Button>

                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                            <Icon name="ChevronLeft" className="w-5 h-5" />
                        </button>
                        <span className="px-4 font-bold min-w-[150px] text-center capitalize">{monthName}</span>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                            <Icon name="ChevronRight" className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                        <button onClick={goToToday} className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md">
                            Today
                        </button>
                         <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                        <div className="relative">
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                className={`p-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                title={t('filterEvents')}
                            >
                                <Icon name="Filter" className="w-5 h-5" />
                            </button>
                            {showFilters && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-20">
                                    <div className="space-y-1">
                                        {(['HARVEST', 'PAYMENT', 'INCIDENT', 'TEST'] as const).map(type => (
                                            <label key={type} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={filters[type]} 
                                                    onChange={e => setFilters(p => ({...p, [type]: e.target.checked}))}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm capitalize">{type.toLowerCase()}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Card className="flex-grow flex flex-col p-0 overflow-hidden">
                {/* Week Header */}
                <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {dayNames.map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 flex-grow auto-rows-fr bg-gray-200 dark:bg-gray-700 gap-px">
                    {calendarDays.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="bg-gray-50/50 dark:bg-gray-900/50 min-h-[120px]"></div>;

                        const dayEvents = events.filter(e => isSameDate(e.date, date));
                        const isToday = isSameDate(date, new Date());

                        return (
                            <div key={date.toISOString()} className={`bg-white dark:bg-gray-900 min-h-[120px] p-2 flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 relative ${isToday ? 'bg-blue-50/30' : ''}`}>
                                <span className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {date.getDate()}
                                </span>
                                <div className="flex-grow space-y-1 overflow-y-auto max-h-[120px] custom-scrollbar">
                                    {dayEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`text-xs px-2 py-1 rounded border truncate cursor-pointer shadow-sm hover:opacity-80 transition-opacity ${event.colorClass}`}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {selectedEvent && (
                <Modal
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    title={selectedEvent.title}
                    widthClass="max-w-md"
                    footer={<Button onClick={() => setSelectedEvent(null)}>{t('close')}</Button>}
                >
                    <div className="text-sm">
                        <div className={`p-3 rounded-lg mb-4 border ${selectedEvent.colorClass}`}>
                            <span className="font-bold uppercase tracking-wider text-xs">{selectedEvent.type}</span>
                        </div>
                        {selectedEvent.details}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default OperationalCalendar;
