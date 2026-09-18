import React from 'react';
import { Sidebar } from './Sidebar';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      {/* Sidebar Drawer */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-[200px] z-50 animate-in slide-in-from-left duration-200">
        <Sidebar onCloseMobile={onClose} />
      </div>
    </div>
  );
};
