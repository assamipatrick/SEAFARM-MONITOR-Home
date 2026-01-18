
import React, { forwardRef } from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`
        h-4 w-4 rounded 
        border-gray-300 dark:border-gray-600 
        text-blue-600 focus:ring-blue-500 
        bg-white dark:bg-gray-700 
        cursor-pointer 
        transition-all duration-200 
        focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${className}
      `}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
