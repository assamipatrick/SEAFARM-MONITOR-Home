import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import Icon from './Icon';
import Button from './Button';
import Select from './Select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  onItemsPerPageChange: (value: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
}) => {
  const { t } = useLocalization();

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pageNumbers = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > 3) {
        pageNumbers.push('...');
      }
      if (currentPage > 2) {
        pageNumbers.push(currentPage - 1);
      }
      if (currentPage !== 1 && currentPage !== totalPages) {
        pageNumbers.push(currentPage);
      }
      if (currentPage < totalPages - 1) {
        pageNumbers.push(currentPage + 1);
      }
      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }
      pageNumbers.push(totalPages);
    }
    return [...new Set(pageNumbers)]; // Remove duplicates that can happen with small totalPages
  };

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
      <div className="mb-2 md:mb-0">
        {t('pagination.showing')} {startItem}-{endItem} {t('pagination.of')} {totalItems} {t('pagination.results')}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <span>{t('pagination.itemsPerPage')}:</span>
            <Select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="!w-20"
            >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="!px-2"
            aria-label={t('pagination.previous')}
          >
            <Icon name="ChevronLeft" className="w-5 h-5" />
            <span className="hidden sm:inline">{t('pagination.previous')}</span>
          </Button>
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) =>
              typeof page === 'number' ? (
                <Button
                  key={index}
                  variant={currentPage === page ? 'primary' : 'ghost'}
                  onClick={() => onPageChange(page)}
                  className="!px-3 !py-1"
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2 py-1">...</span>
              )
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="!px-2"
            aria-label={t('pagination.next')}
          >
            <span className="hidden sm:inline">{t('pagination.next')}</span>
            <Icon name="ChevronRight" className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;