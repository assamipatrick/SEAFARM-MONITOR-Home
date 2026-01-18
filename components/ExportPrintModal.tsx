
import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Icon from './ui/Icon';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import type { ExportDocument } from '../types';
import PrintableInvoice from './printable/PrintableInvoice';
import PrintablePackingList from './printable/PrintablePackingList';
import PrintableCertOfOrigin from './printable/PrintableCertOfOrigin';

// Declare libraries from window object
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

type DocType = 'invoice' | 'packing-list' | 'cert-of-origin' | 'all';

interface ExportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: ExportDocument;
  docTypeToShow: DocType;
}

const ExportPrintModal: React.FC<ExportPrintModalProps> = ({ isOpen, onClose, doc, docTypeToShow }) => {
    const { t } = useLocalization();
    const { settings } = useSettings();
    const [isDownloading, setIsDownloading] = useState(false);

    const getModalTitle = () => {
        switch(docTypeToShow) {
            case 'invoice':
                return `${t('printInvoice')} - ${doc.docNo}`;
            case 'packing-list':
                return `${t('printPackingList')} - ${doc.docNo}`;
            case 'cert-of-origin':
                return `${t('printCertOfOrigin')} - ${doc.docNo}`;
            case 'all':
            default:
                return `${t('printDocumentsFor')} ${doc.docNo}`;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        document.body.classList.add('generating-pdf');
        try {
            const { jsPDF } = window.jspdf;
            const html2canvas = window.html2canvas;
            const printableArea = document.getElementById('printable-area');
            if (!printableArea) throw new Error('Printable area not found');

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            
            pdf.setProperties({
                title: `Export Documents - ${doc.docNo}`,
                subject: 'Export Documentation',
                author: settings.company.name,
                creator: 'AlgaManage'
            });

            const pages = printableArea.getElementsByClassName('print-page');

            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i] as HTMLElement, { 
                    scale: 4, // Higher scale for improved quality
                    useCORS: true,
                    // Force portrait width to prevent mobile layout capture
                    windowWidth: 1200,
                    backgroundColor: '#ffffff' 
                });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }
            
            pdf.save(`Export-Documents-${doc.docNo}.pdf`);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(t('pdfGenerationError'));
        } finally {
            document.body.classList.remove('generating-pdf');
            setIsDownloading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} widthClass="max-w-screen-lg">
            {/* Floating Action Bar */}
            <div className="fixed bottom-6 right-6 z-[1100] no-print flex gap-3">
                <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex gap-2 animate-in fade-in slide-in-from-bottom-4">
                    <Button onClick={handleDownloadPdf} disabled={isDownloading} className="rounded-full !px-4 shadow-sm">
                        <Icon name={isDownloading ? 'Activity' : 'Download'} className={`w-5 h-5 ${isDownloading ? 'animate-spin' : ''}`} />
                        <span className="ml-2">{isDownloading ? t('downloading') : t('downloadPdf')}</span>
                    </Button>
                    <Button onClick={handlePrint} variant="primary" className="rounded-full !px-4 shadow-md">
                        <Icon name="Printer" className="w-5 h-5" />
                        <span className="ml-2">{t('print')}</span>
                    </Button>
                </div>
            </div>

            <div id="printable-area" className="bg-gray-200 dark:bg-gray-700 p-4 sm:p-8">
                {(docTypeToShow === 'invoice' || docTypeToShow === 'all') && <PrintableInvoice doc={doc} />}
                {(docTypeToShow === 'packing-list' || docTypeToShow === 'all') && <PrintablePackingList doc={doc} />}
                {(docTypeToShow === 'cert-of-origin' || docTypeToShow === 'all') && <PrintableCertOfOrigin doc={doc} />}
            </div>
        </Modal>
    );
};

export default ExportPrintModal;
