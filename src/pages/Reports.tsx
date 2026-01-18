
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import FarmerMonthlyDataReport from '../components/reports/FarmerMonthlyDataReport';
import IndividualFarmerReport from '../components/reports/IndividualFarmerReport';
import CustomReport from '../components/reports/CustomReport';
import GlobalFarmReport from '../components/reports/GlobalFarmReport'; // Import the new report
import { exportReportToExcel } from '../utils/excelExporter';
import { useSettings } from '../contexts/SettingsContext';

// FIX: Declare libraries from window object to resolve TypeScript errors.
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

const Reports: React.FC = () => {
    const { t } = useLocalization();
    const { farmers } = useData();
    const { settings } = useSettings();
    
    const [reportType, setReportType] = useState('global_farm_report'); // Default to new report
    const [month, setMonth] = useState(() => new Date().getMonth());
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    
    // Custom Report State
    const [customSections, setCustomSections] = useState<string[]>(['production', 'finance', 'inventory']);
    
    const [reportGenerated, setReportGenerated] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

    const years = useMemo(() => Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i), []);
    const monthKeys = useMemo(() => ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'], []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
    
    const sortedFarmers = useMemo(() => [...farmers].sort((a,b) => a.firstName.localeCompare(b.firstName)), [farmers]);

    useEffect(() => {
        if (sortedFarmers.length > 0 && !selectedFarmerId) {
            setSelectedFarmerId(sortedFarmers[0].id);
        }
    }, [sortedFarmers, selectedFarmerId]);

    const handleGenerateReport = () => {
        setReportGenerated(true);
    };

    const handlePrint = () => {
        // Direct call to window.print() is most reliable across modern browsers
        window.print();
    };
    
    const handleExportExcel = async () => {
        setIsDownloadingExcel(true);
        try {
            const fileName = `${reportType}_${year}_${month + 1}`;
            const title = t('reportsTitle');
            
            await exportReportToExcel(title, fileName);
        } catch (e) {
            console.error("Excel export failed", e);
            alert("Export failed. See console for details.");
        } finally {
            setIsDownloadingExcel(false);
        }
    };

    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        document.body.classList.add('generating-pdf');
        try {
            const { jsPDF } = window.jspdf;
            const html2canvas = window.html2canvas;
            const printableArea = document.getElementById('printable-area');
            if (!printableArea) throw new Error('Printable area not found');

            const isLandscape = ['farmer_monthly', 'global_farm_report'].includes(reportType);
            
            const orientation = isLandscape ? 'l' : 'p';
            const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
            
            // Set Metadata
            pdf.setProperties({
                title: `${reportType.replace(/_/g, ' ').toUpperCase()} - ${year}-${(month + 1).toString().padStart(2, '0')}`,
                subject: 'AlgaManage Report',
                author: settings.company.name || 'AlgaManage',
                creator: 'AlgaManage System'
            });
            
            const pages = printableArea.getElementsByClassName(isLandscape ? 'report-page-landscape' : 'print-page');
            const targetPages = pages.length > 0 ? pages : printableArea.getElementsByClassName('print-page');

            for (let i = 0; i < targetPages.length; i++) {
                const pageElement = targetPages[i] as HTMLElement;

                const canvas = await html2canvas(pageElement, { 
                    scale: 3, // Good balance of quality and file size
                    useCORS: true,
                    logging: false,
                    // Force consistent rendering width regardless of device screen
                    windowWidth: isLandscape ? 1920 : 1200,
                    // Ensure height captures all content
                    windowHeight: pageElement.scrollHeight + 50, 
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG is smaller than PNG for reports
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                const pxToMm = pdfWidth / imgWidth;
                
                // Calculate how much height the image takes on PDF
                const imgPdfHeight = imgHeight * pxToMm;
                
                if (i > 0) {
                    pdf.addPage();
                }

                // If image height is close to or less than page height, fit it.
                // Otherwise, we might need to split, but our components (PrintPage) are designed to fit A4.
                if (imgPdfHeight <= pdfHeight + 2) { // +2mm tolerance
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgPdfHeight, undefined, 'FAST');
                } else {
                    // If the captured HTML element is taller than A4, shrink to fit (typical behavior for report pages)
                    // or center it. For now, let's scale to fit width and let height be whatever (multipage logic omitted for strict PrintPage components)
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgPdfHeight, undefined, 'FAST');
                }
            }
            
            const monthString = (month + 1).toString().padStart(2, '0');
            const sanitizedReportName = reportType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
            pdf.save(`${sanitizedReportName}_${year}_${monthString}.pdf`);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(t('pdfGenerationError'));
        } finally {
            document.body.classList.remove('generating-pdf');
            setIsDownloadingPdf(false);
        }
    };
    
    const handleSectionToggle = (section: string) => {
        setCustomSections(prev => 
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
        setReportGenerated(false);
    };

    const isDateBasedReport = ['individual_farmer', 'custom', 'global_farm_report'].includes(reportType);
    const isYearBasedReport = ['farmer_monthly'].includes(reportType);

    const renderReport = () => {
        if (!reportGenerated) return (
            <div className="text-center p-8 text-gray-500 no-print">{t('selectFiltersAndGenerate')}</div>
        );
        switch (reportType) {
            case 'global_farm_report': return <GlobalFarmReport month={month} year={year} />;
            case 'farmer_monthly': return <FarmerMonthlyDataReport year={year} />;
            case 'individual_farmer': return <IndividualFarmerReport month={month} year={year} farmerId={selectedFarmerId} />;
            case 'custom': return <CustomReport month={month} year={year} sections={customSections} />;
            default: return null;
        }
    };

    return (
        <div className="pb-20">
            <h1 className="text-3xl font-bold mb-6">{t('reportsTitle')}</h1>

            <Card title={t('selectReportType')} className="mb-6 no-print">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                        <Select label={t('selectReportType')} value={reportType} onChange={e => { setReportType(e.target.value); setReportGenerated(false); }}>
                            <option value="global_farm_report">{t('globalFarmReport')}</option>
                            <option value="custom">{t('customReport')}</option>
                            <option value="farmer_monthly">{t('farmerMonthlyReport')}</option>
                            <option value="individual_farmer">{t('individualFarmerReport')}</option>
                        </Select>
                        {isDateBasedReport && (
                            <>
                                <Select label={t('month')} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                                    {months.map(m => <option key={m} value={m}>{t(monthKeys[m] as any)}</option>)}
                                </Select>
                                <Select label={t('year')} value={year} onChange={e => setYear(parseInt(e.target.value))}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </Select>
                            </>
                        )}
                        {isYearBasedReport && (
                            <Select label={t('year')} value={year} onChange={e => setYear(parseInt(e.target.value))}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </Select>
                        )}
                        
                        {reportType === 'individual_farmer' && (
                             <Select label={t('selectFarmer')} value={selectedFarmerId} onChange={e => setSelectedFarmerId(e.target.value)}>
                                {sortedFarmers.map(f => <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>)}
                            </Select>
                        )}
                        
                        <div className={(isDateBasedReport || isYearBasedReport) ? '' : 'xl:col-start-5'}>
                            <Button onClick={handleGenerateReport} className="w-full h-[42px]">
                                <Icon name="FileText" className="w-5 h-5"/>{t('generateReport')}
                            </Button>
                        </div>
                    </div>

                    {reportType === 'custom' && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">{t('selectSections')}</h4>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={customSections.includes('production')} onChange={() => handleSectionToggle('production')} />
                                    <span className="text-sm">{t('section_production')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={customSections.includes('finance')} onChange={() => handleSectionToggle('finance')} />
                                    <span className="text-sm">{t('section_finance')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={customSections.includes('inventory')} onChange={() => handleSectionToggle('inventory')} />
                                    <span className="text-sm">{t('section_inventory')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={customSections.includes('hr')} onChange={() => handleSectionToggle('hr')} />
                                    <span className="text-sm">{t('section_hr')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={customSections.includes('incidents')} onChange={() => handleSectionToggle('incidents')} />
                                    <span className="text-sm">{t('section_incidents')}</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            
            {reportGenerated && (
                 <div className="fixed bottom-6 right-6 z-50 no-print flex gap-3">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <Button variant="secondary" onClick={handleExportExcel} disabled={isDownloadingExcel} className="rounded-full !px-4 shadow-sm">
                            <Icon name={isDownloadingExcel ? 'Activity' : 'FileSpreadsheet'} className={`w-5 h-5 ${isDownloadingExcel ? 'animate-spin' : ''}`} />
                            <span className="ml-2 hidden sm:inline">{t('exportExcel')}</span>
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="rounded-full !px-4 shadow-sm">
                            <Icon name={isDownloadingPdf ? 'Activity' : 'Download'} className={`w-5 h-5 ${isDownloadingPdf ? 'animate-spin' : ''}`} />
                            <span className="ml-2 hidden sm:inline">{isDownloadingPdf ? t('downloading') : t('downloadPdf')}</span>
                        </Button>
                        <Button variant="primary" onClick={handlePrint} className="rounded-full !px-4 shadow-md">
                            <Icon name="Printer" className="w-5 h-5" />
                            <span className="ml-2 hidden sm:inline">{t('print')}</span>
                        </Button>
                    </div>
                </div>
            )}

            <div id="printable-area" className="overflow-x-auto pb-8">
                {renderReport()}
            </div>
        </div>
    );
};

export default Reports;
