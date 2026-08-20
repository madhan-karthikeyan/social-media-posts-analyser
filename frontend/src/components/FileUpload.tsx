import { useCallback, useRef, useState } from 'react';
import { Upload, FileImage, FileText, X } from 'lucide-react';

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.pdf';
const MAX_FILE_SIZE_MB = 20;

interface FileUploadProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
  error: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type === 'application/pdf') {
    return <FileText className="h-8 w-8 text-[var(--color-error)]" strokeWidth={1.5} />;
  }
  return <FileImage className="h-8 w-8 text-[var(--color-accent)]" strokeWidth={1.5} />;
}

export function FileUpload({ selectedFile, onFileSelect, disabled, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  const validateAndSelect = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onFileSelect(null);
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSelect(files[0]);
    }
  }, [validateAndSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
    e.target.value = '';
  }, [validateAndSelect]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleClearFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
        Upload file
      </label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label="Upload a PDF or image file"
      />

      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {fileIcon(selectedFile.type)}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">
              {selectedFile.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {formatSize(selectedFile.size)}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClearFile}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          disabled={disabled}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent-muted)] hover:bg-[var(--color-surface-alt)]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Upload
            className={`h-8 w-8 ${isDragging ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {isDragging ? 'Drop your file here' : 'Drag and drop a file here'}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            JPG, PNG, WebP, GIF, or PDF — up to {MAX_FILE_SIZE_MB} MB
          </p>
        </button>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
