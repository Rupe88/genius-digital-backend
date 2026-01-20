import React, { useId } from 'react';
import { classNames } from '@/lib/utils/helpers';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  className,
  id,
  options,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={classNames(
          'w-full px-4 py-2 border rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition-colors',
          error ? 'border-[var(--error)] focus:ring-red-500' : 'border-[var(--border)]',
          'bg-[var(--input)] text-[var(--foreground)]',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <p className="mt-1 text-sm text-[var(--error)]">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</p>
      )}
    </div>
  );
};

