import { X, Link } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleSheetChipProps {
  url: string;
  onRemove?: () => void;
}

const GoogleSheetChip = ({ url, onRemove }: GoogleSheetChipProps) => {
  // Extract a readable name from the URL
  const getDisplayName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];
      return `Google Sheet (${spreadsheetId.substring(0, 8)}...)`;
    } catch {
      return 'Google Sheet';
    }
  };

  return (
    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center justify-center w-5 h-5 bg-blue-500/20 rounded">
        <Link className="w-4 h-4 text-blue-500" />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-foreground truncate max-w-[200px]">
          {getDisplayName(url)}
        </span>
        <span className="text-xs text-blue-600 dark:text-blue-400">Google Sheets</span>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-blue-500/20 text-muted-foreground hover:text-foreground ml-1"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default GoogleSheetChip;
