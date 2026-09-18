import React from 'react';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-crm-primary rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};
