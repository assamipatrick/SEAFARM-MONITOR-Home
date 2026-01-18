
import React from 'react';
import Icon from './Icon';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, id, containerClassName = '', error, type, className = '', ...props }) => {
  const { required } = props;

  const errorClasses = error 
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500';

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && 
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      }
      <div className="relative">
        <input
          id={id}
          type={type}
          className={`
            w-full px-3 py-2 
            bg-white dark:bg-gray-700 
            text-gray-900 dark:text-white 
            placeholder-gray-400
            border rounded-lg shadow-sm 
            focus:outline-none focus:ring-2 focus:ring-offset-0 
            transition-all duration-200
            disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60
            ${errorClasses} 
            ${type === 'date' ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {type === 'date' && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Icon name="Calendar" className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Input;
