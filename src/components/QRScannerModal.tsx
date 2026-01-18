
import React, { useEffect, useRef, useState } from 'react';
import Modal from './ui/Modal';
import { useLocalization } from '../contexts/LocalizationContext';
import Button from './ui/Button';

// FIX: Declare the Html5QrcodeScanner library which is loaded from a script tag.
declare const Html5QrcodeScanner: any;

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan }) => {
    const { t } = useLocalization();
    const scannerRef = useRef<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && !scannerRef.current) {
            // Small delay to ensure modal DOM is ready
            setTimeout(() => {
                try {
                     const scanner = new Html5QrcodeScanner(
                        "qr-reader",
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        /* verbose= */ false
                    );
                    scanner.render((decodedText: string) => {
                        scanner.clear().then(() => {
                            onScan(decodedText);
                        });
                    }, (errorMessage: string) => {
                        // console.log(errorMessage); // Ignore frame errors
                    });
                    scannerRef.current = scanner;
                } catch (e) {
                    setError("Camera access needed or library missing.");
                }
            }, 100);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((e: any) => console.error(e));
                scannerRef.current = null;
            }
        };
    }, [isOpen, onScan]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('scanQRCode')}
            widthClass="max-w-md"
        >
            <div className="flex flex-col items-center justify-center">
                <div id="qr-reader" className="w-full"></div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
                <p className="text-sm text-gray-500 mt-4 text-center">{t('scanInstruction')}</p>
            </div>
        </Modal>
    );
};

export default QRScannerModal;
