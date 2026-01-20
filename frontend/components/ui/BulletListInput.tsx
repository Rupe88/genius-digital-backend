'use client';

import React, { useState } from 'react';
import { HiPlus, HiTrash, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import { Button } from './Button';
import { Input } from './Input';

interface BulletListInputProps {
    label?: string;
    value?: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    helperText?: string;
    error?: string;
    maxItems?: number;
}

export const BulletListInput: React.FC<BulletListInputProps> = ({
    label,
    value = [],
    onChange,
    placeholder = "Add a new item...",
    helperText,
    error,
    maxItems = 20,
}) => {
    const [newItem, setNewItem] = useState('');

    const handleAddItem = () => {
        if (newItem.trim() && value.length < maxItems) {
            if (value.includes(newItem.trim())) {
                setNewItem('');
                return;
            }
            onChange([...value, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleRemoveItem = (index: number) => {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const handleUpdateItem = (index: number, newValue: string) => {
        const newValues = [...value];
        newValues[index] = newValue;
        onChange(newValues);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === value.length - 1) return;

        const newValues = [...value];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newValues[index], newValues[targetIndex]] = [newValues[targetIndex], newValues[index]];
        onChange(newValues);
    };

    return (
        <div className="space-y-4">
            {label && (
                <label className="block text-sm font-medium text-[var(--foreground)]">
                    {label}
                </label>
            )}

            <div className="space-y-2">
                {value.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start group">
                        <div className="flex flex-col gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-blue-500 disabled:opacity-30"
                            >
                                <HiChevronUp className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveItem(index, 'down')}
                                disabled={index === value.length - 1}
                                className="text-gray-400 hover:text-blue-500 disabled:opacity-30"
                            >
                                <HiChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 bg-white border border-[var(--border)] rounded-none p-3 flex items-start gap-4 shadow-sm hover:border-blue-300 transition-all">
                            <div className="w-6 h-6 rounded-none bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {index + 1}
                            </div>
                            <textarea
                                value={item}
                                onChange={(e) => handleUpdateItem(index, e.target.value)}
                                className="flex-1 text-sm text-[var(--foreground)] bg-transparent border-none outline-none resize-none min-h-[24px]"
                                rows={1}
                                style={{ height: 'auto' }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove item"
                            >
                                <HiTrash className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {value.length < maxItems && (
                <div className="flex gap-2">
                    <div className="flex-1">
                        <div className="relative">
                            <textarea
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={placeholder}
                                className="w-full pl-4 pr-12 py-3 border border-dashed border-[var(--border)] rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-all min-h-[48px]"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddItem}
                                disabled={!newItem.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-none bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                            >
                                <HiPlus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}

            {value.length >= maxItems && (
                <p className="text-xs text-orange-500">Maximum {maxItems} items reached.</p>
            )}
        </div>
    );
};
