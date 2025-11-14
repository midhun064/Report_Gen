import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileChipProps {
  filename: string;
  onRemove?: () => void;
}

const FileChip = ({ filename, onRemove }: FileChipProps) => {
  return (
    <div className="inline-flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center justify-center w-5 h-5 bg-green-500/20 rounded">
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          <path d="M8 2v4a2 2 0 002 2h4" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-foreground truncate max-w-[200px]">
          {filename}
        </span>
        <span className="text-xs text-muted-foreground">Spreadsheet</span>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-muted text-muted-foreground hover:text-foreground ml-1"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default FileChip;
