import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const MedicineDescription = ({ medicine, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full mt-2 p-4 bg-gray-50 rounded-lg shadow">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <p className="text-sm text-gray-700 leading-relaxed">
            {medicine.description || 'No description available'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 flex-shrink-0"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V2.5A1.5 1.5 0 0014.5 1h-5A1.5 1.5 0 008 2.5V4a8 8 0 01-4 8zm16 0a8 8 0 01-8 8v1.5A1.5 1.5 0 0013.5 23h5a1.5 1.5 0 001.5-1.5V20a8 8 0 014-8z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default MedicineDescription;