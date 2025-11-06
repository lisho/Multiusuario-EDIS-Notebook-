
import React from 'react';

export const SparklesIcon: React.FC<{className?: string}> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 01-1.414 1.414L12 6.414l-2.293 2.293a1 1 0 01-1.414-1.414L10 4.707M12 21l2.293-2.293a1 1 0 01-1.414-1.414L12 17.586l-2.293-2.293a1 1 0 01-1.414 1.414L10 19.293m9.293-8.293l-2.293 2.293a1 1 0 01-1.414-1.414L17.586 12l-2.293-2.293a1 1 0 011.414-1.414L19.293 10M4.707 10l2.293 2.293a1 1 0 01-1.414 1.414L3 11.414l2.293-2.293a1 1 0 011.414 1.414L4.707 12z" />
  </svg>
);
