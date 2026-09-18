import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-md">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Button
        variant="primary"
        size="md"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/dashboard')}
        className="mt-6 text-xs font-semibold"
      >
        Back to Dashboard
      </Button>
    </div>
  );
};
