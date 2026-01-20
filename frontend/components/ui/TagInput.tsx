'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { HiX, HiPlus } from 'react-icons/hi';

interface TagInputProps {
  label?: string;
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  error?: string;
  helperText?: string;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  value = [],
  onChange,
  placeholder = "Add a tag...",
  suggestions = [],
  maxTags = 10,
  error,
  helperText,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions.filter(
        suggestion =>
          suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(suggestion)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  }, [inputValue, suggestions, value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagText: string) => {
    const trimmedTag = tagText.trim();
    if (!trimmedTag) return;

    if (value.includes(trimmedTag)) {
      // Tag already exists, just clear input
      setInputValue('');
      return;
    }

    if (value.length >= maxTags) {
      return; // Max tags reached
    }

    const newTags = [...value, trimmedTag];
    onChange?.(newTags);
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    onChange?.(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        addTag(filteredSuggestions[selectedSuggestionIndex]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}

      <div className={`relative border rounded-none p-3 transition-colors ${
        error
          ? 'border-[var(--error)] bg-[var(--error-50)]'
          : isFocused
          ? 'border-[var(--primary-500)] bg-white shadow-sm'
          : 'border-[var(--border)] bg-[var(--muted-50)]'
      }`}>
        {/* Tags Display */}
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-[var(--primary-100)] text-[var(--primary-800)] rounded-none border border-[var(--primary-200)] hover:bg-[var(--primary-200)] transition-colors"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="flex items-center justify-center w-4 h-4 rounded-none hover:bg-[var(--primary-200)] transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <HiX className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (inputValue.trim() && filteredSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder-[var(--muted-foreground)]"
            disabled={value.length >= maxTags}
          />
        </div>

        {/* Max tags indicator */}
        {value.length >= maxTags && (
          <div className="text-xs text-[var(--muted-foreground)]">
            Maximum {maxTags} tags allowed
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[var(--border)] rounded-none shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--muted-50)] transition-colors ${
                  index === selectedSuggestionIndex
                    ? 'bg-[var(--primary-50)] text-[var(--primary-700)]'
                    : 'text-[var(--foreground)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <HiPlus className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span>{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error and Helper Text */}
      {error && (
        <p className="mt-1 text-sm text-[var(--error)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</p>
      )}

      {/* Instructions */}
      <div className="mt-2 text-xs text-[var(--muted-foreground)] space-y-1">
        <p>• Press Enter, comma, or semicolon to add tags</p>
        <p>• Press Backspace to remove the last tag</p>
        <p>• Click on suggestions to add them quickly</p>
      </div>
    </div>
  );
};
