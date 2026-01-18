
import React, { useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

declare const QRCode: any;

interface PrintableQRLabelProps {
    qrData: { type: 'module' | 'batch', id: string };
    title: string;
    subtitle?: string;
    detail?: string;
    onClose: () => void;
}

const PrintableQRLabel: React.FC<PrintableQRLabelProps> = ({ qrData, title, subtitle, detail, onClose }) => {
    const { settings } = useSettings();
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (qrRef.current) {
            qrRef.current.innerHTML = '';
            new QRCode(qrRef.current, {
                text: JSON.stringify(qrData),
                width: 128,
                height: 128,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
    }, [qrData]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4">
                
                {/* Printable Area */}
                <div id="printable-qr-label" className="border-2 border-black p-4 flex flex-col items-center text-center bg-white w-[300px] h-[200px] mx-auto mb-6">
                    <div className="flex items-center gap-2 w-full border-b border-gray-300 pb-2 mb-2">
                         <img src={settings.company.logoUrl} className="h-8 object-contain" />
                         <span className="text-xs font-bold uppercase truncate">{settings.company.name}</span>
                    </div>
                    <div className="flex-grow flex flex-row items-center gap-4 w-full">
                        <div ref={qrRef} className="w-[96px] h-[96px]"></div>
                        <div className="text-left flex-1 overflow-hidden">
                            <h2 className="text-lg font-bold leading-tight uppercase break-words">{title}</h2>
                            {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
                            {detail && <p className="text-[10px] font-mono mt-2">{detail}</p>}
                        </div>
                    </div>
                    <div className="text-[8px] text-gray-400 w-full text-right mt-1">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>

                <div className="flex justify-end gap-2 no-print">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Close</button>
                    <button onClick={handlePrint} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print Label
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintableQRLabel;