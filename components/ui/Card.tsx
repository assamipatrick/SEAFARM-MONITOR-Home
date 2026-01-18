
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, onClick }) => {
  const finalClassName = `
    bg-white/80 dark:bg-gray-800/60
    backdrop-blur-xl
    border border-white/20 dark:border-gray-700/50
    rounded-xl shadow-xl p-6 
    ${onClick ? 'cursor-pointer hover:bg-white/90 dark:hover:bg-gray-800/70 transition-all' : ''} 
    ${className}
  `;
  return (
    <div className={finalClassName.trim()} onClick={onClick}>
      {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;
