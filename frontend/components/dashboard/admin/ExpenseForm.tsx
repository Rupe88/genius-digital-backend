'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';
import { Expense } from '@/lib/api/admin';

interface ExpenseFormProps {
  expense?: Expense;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: expense?.title || '',
    description: expense?.description || '',
    amount: expense?.amount?.toString() || '',
    category: expense?.category || 'OTHER',
    instructorId: expense?.instructorId || '',
    courseId: expense?.courseId || '',
    paymentMethod: expense?.paymentMethod || '',
    invoiceNumber: expense?.invoiceNumber || '',
  });
  const [loading, setLoading] = useState(false);

  const expenseCategories = [
    'MARKETING',
    'SALARY',
    'INFRASTRUCTURE',
    'SOFTWARE',
    'HARDWARE',
    'OFFICE_RENT',
    'UTILITIES',
    'INSURANCE',
    'PROFESSIONAL_SERVICES',
    'TRAVEL',
    'TRAINING',
    'OTHER',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      };
      if (expense) {
        await adminApi.updateExpense(expense.id, submitData);
      } else {
        await adminApi.createExpense(submitData);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <h2 className="text-xl font-bold mb-4">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Amount (NPR) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-none"
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <input
              type="text"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              placeholder="e.g., BANK_TRANSFER, CASH"
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Invoice Number</label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : expense ? 'Update' : 'Create'} Expense
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
};

