import React from 'react';
import { X, FileSpreadsheet, File } from 'lucide-react';

interface FileChipProps {
  filename: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const FileChip: React.FC<FileChipProps> = ({ filename, onRemove, size = 'md' }) => {
  // Determine file type icon
  const getFileIcon = () => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      return <FileSpreadsheet className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-green-600`} />;
    } else if (extension === 'csv') {
      return <File className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />;
    } else {
      return <File className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-gray-600`} />;
    }
  };

  // Truncate long filenames
  const displayName = filename.length > 20 ? `${filename.substring(0, 17)}...` : filename;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-200 dark:hover:bg-gray-700`}>
      {getFileIcon()}
      <span className="truncate max-w-[150px]" title={filename}>
        {displayName}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${filename}`}
        >
          <X className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-gray-500 dark:text-gray-400`} />
        </button>
      )}
    </div>
  );
};

export default FileChip;
