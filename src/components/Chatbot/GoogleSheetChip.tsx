import React from 'react';
import { X, FileSpreadsheet } from 'lucide-react';

interface GoogleSheetChipProps {
  url: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const GoogleSheetChip: React.FC<GoogleSheetChipProps> = ({ url, onRemove, size = 'md' }) => {
  // Extract sheet ID and create display name
  const getDisplayName = () => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];
      if (spreadsheetId) {
        return `Google Sheet (${spreadsheetId.substring(0, 8)}...)`;
      }
      return 'Google Sheet';
    } catch {
      return 'Google Sheet';
    }
  };

  const displayName = getDisplayName();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-lg ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-green-700 dark:text-green-300 transition-all hover:bg-green-100 dark:hover:bg-green-900/30`}>
      <FileSpreadsheet className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-green-600 dark:text-green-400`} />
      <span className="truncate max-w-[150px]" title={url}>
        {displayName}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${displayName}`}
        >
          <X className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-green-500 dark:text-green-400`} />
        </button>
      )}
    </div>
  );
};

export default GoogleSheetChip;
