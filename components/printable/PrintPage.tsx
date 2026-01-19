import React from 'react';

interface PrintPageProps {
  children: React.ReactNode;
  landscape?: boolean;
  title?: string;
  showPageNumber?: boolean;
  pageNumber?: number;
  totalPages?: number;
}

const PrintPage: React.FC<PrintPageProps> = ({ 
  children, 
  landscape = false,
  title,
  showPageNumber = false,
  pageNumber,
  totalPages
}) => {
  const pageClass = landscape ? 'report-page-landscape' : 'report-page-portrait';
  
  return (
    <div className={`print-page ${pageClass} bg-white shadow-lg`}>
      {/* Page Header */}
      {title && (
        <div className="print-header mb-6 border-b-2 border-gray-300 pb-3">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </div>
      )}
      
      {/* Page Content */}
      <div className="print-content flex-1">
        {children}
      </div>
      
      {/* Page Footer with Page Number */}
      {showPageNumber && pageNumber && totalPages && (
        <div className="print-footer mt-6 pt-3 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>Page {pageNumber} sur {totalPages}</p>
        </div>
      )}
    </div>
  );
};

export default PrintPage;
