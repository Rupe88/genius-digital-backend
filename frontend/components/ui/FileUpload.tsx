'use client';

import React, { useRef, useState, useId } from 'react';
import { HiUpload, HiX, HiPhotograph } from 'react-icons/hi';
import { classNames } from '@/lib/utils/helpers';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  error?: string;
  helperText?: string;
  value?: File | string | null; // File object or image URL
  onChange?: (file: File | null) => void;
  onRemove?: () => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  maxSize = 5,
  error,
  helperText,
  value,
  onChange,
  onRemove,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    typeof value === 'string' ? value : null
  );
  const generatedId = useId();

  const handleFile = (file: File) => {
    // Validate file type
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      alert(`Invalid file type. Please upload ${accept}`);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      alert(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    onChange?.(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange?.(null);
    onRemove?.();
  };

  return (
    <div className={classNames('w-full', className)}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}

      {preview ? (
        <div className="relative inline-block">
          <div className="relative w-40 h-24 rounded-none overflow-hidden border-2 border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
            <img
              src={preview}
              alt="Course Thumbnail"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-none hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-lg"
              aria-label="Remove thumbnail"
            >
              <HiX className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--muted-foreground)] text-center">
            Course Thumbnail
          </p>
        </div>
      ) : (
        <div
          className={classNames(
            'relative border-2 border-dashed rounded-none p-4 text-center transition-colors cursor-pointer',
            dragActive
              ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
              : error
              ? 'border-[var(--error)]'
              : 'border-[var(--border)] hover:border-[var(--primary-300)]',
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            id={generatedId}
          />
          <HiPhotograph className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" />
          <p className="mt-2 text-sm text-[var(--foreground)]">
            <span className="font-medium text-[var(--primary-600)]">Upload thumbnail</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            PNG, JPG up to {maxSize}MB • 16:9 recommended
          </p>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-[var(--error)]">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</p>
      )}
    </div>
  );
};

