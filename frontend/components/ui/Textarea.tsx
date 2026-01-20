import React, { useId } from 'react';
import { classNames } from '@/lib/utils/helpers';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}) => {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        className={classNames(
          'w-full px-4 py-2 border rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition-colors resize-y',
          error ? 'border-[var(--error)] focus:ring-red-500' : 'border-[var(--border)]',
          'bg-[var(--input)] text-[var(--foreground)]',
          className
        )}
        {...props}
      />

      {error && <p className="mt-1 text-sm text-[var(--error)]">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</p>
      )}
    </div>
  );
};

