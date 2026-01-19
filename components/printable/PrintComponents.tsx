import React from 'react';

interface PrintHeaderProps {
  companyName?: string;
  companyLogo?: string;
  documentTitle: string;
  documentNumber?: string;
  date?: string;
  rightContent?: React.ReactNode;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  companyName,
  companyLogo,
  documentTitle,
  documentNumber,
  date,
  rightContent
}) => {
  return (
    <div className="print-header mb-8 pb-4 border-b-2 border-gray-800">
      <div className="flex justify-between items-start">
        {/* Left: Logo and Company */}
        <div className="flex items-center gap-4">
          {companyLogo && (
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-16 w-auto object-contain"
            />
          )}
          {companyName && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">{companyName}</h2>
            </div>
          )}
        </div>
        
        {/* Right: Document Info or Custom Content */}
        <div className="text-right">
          {rightContent || (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{documentTitle}</h1>
              {documentNumber && (
                <p className="text-sm text-gray-600">N° {documentNumber}</p>
              )}
              {date && (
                <p className="text-sm text-gray-600">Date: {date}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface PrintFooterProps {
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showPageNumber?: boolean;
  pageNumber?: number;
  totalPages?: number;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({
  leftContent,
  centerContent,
  rightContent,
  showPageNumber = false,
  pageNumber,
  totalPages
}) => {
  return (
    <div className="print-footer mt-8 pt-4 border-t border-gray-300">
      <div className="flex justify-between items-center text-xs text-gray-600">
        <div className="flex-1">{leftContent}</div>
        <div className="flex-1 text-center">
          {centerContent}
          {showPageNumber && pageNumber && totalPages && (
            <p>Page {pageNumber} / {totalPages}</p>
          )}
        </div>
        <div className="flex-1 text-right">{rightContent}</div>
      </div>
    </div>
  );
};

interface PrintTableProps {
  headers: string[];
  data: (string | number | React.ReactNode)[][];
  className?: string;
}

export const PrintTable: React.FC<PrintTableProps> = ({ headers, data, className = '' }) => {
  return (
    <table className={`w-full border-collapse ${className}`}>
      <thead>
        <tr className="bg-gray-100">
          {headers.map((header, idx) => (
            <th 
              key={idx}
              className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            {row.map((cell, cellIdx) => (
              <td 
                key={cellIdx}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

interface PrintSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const PrintSection: React.FC<PrintSectionProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`print-section mb-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          {title}
        </h3>
      )}
      <div className="print-section-content">
        {children}
      </div>
    </div>
  );
};
