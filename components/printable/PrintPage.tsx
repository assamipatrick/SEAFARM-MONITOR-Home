import React from 'react';

const PrintPage: React.FC<{ children: React.ReactNode, landscape?: boolean }> = ({ children, landscape = false }) => {
    if (landscape) {
        // The report-page-landscape class from index.html provides fixed A4 dimensions and padding
        return (
            <div className="print-page report-page-landscape bg-white shadow-lg mx-auto my-8 flex flex-col">
                {children}
            </div>
        );
    }
    
    // Default portrait-friendly layout with padding inside
    return (
        <div className="print-page bg-white shadow-lg mx-auto my-8">
            <div className="p-12 text-black font-serif">
                {children}
            </div>
        </div>
    );
};

export default PrintPage;