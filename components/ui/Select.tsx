
import React from 'react';
import Icon from './Icon';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  containerClassName?: string;
  children: React.ReactNode;
  error?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, containerClassName = '', children, error, className = '', ...props }) => {
  const errorClasses = error 
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500';
    
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        <select
          id={id}
          className={`
            w-full px-3 py-2 
            bg-white dark:bg-gray-700 
            text-gray-900 dark:text-white 
            border rounded-lg shadow-sm 
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-all duration-200
            disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60
            appearance-none pr-8
            ${errorClasses}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
         <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <Icon name="ChevronDown" className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Select;
