'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface SalaryPaymentModalProps {
  earningIds: string[];
  totalAmount: number;
  onConfirm: (data: {
    paidAt?: string;
    paymentMethod?: string;
    transactionId?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export const SalaryPaymentModal: React.FC<SalaryPaymentModalProps> = ({
  earningIds,
  totalAmount,
  onConfirm,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    paidAt: new Date().toISOString().slice(0, 16),
    paymentMethod: 'BANK_TRANSFER',
    transactionId: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      paidAt: new Date(formData.paidAt).toISOString(),
      paymentMethod: formData.paymentMethod,
      transactionId: formData.transactionId || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card padding="lg" className="w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Mark Earnings as Paid</h2>
        <p className="mb-4 text-[var(--muted-foreground)]">
          You are about to mark {earningIds.length} earnings as paid. Total amount: Rs.{' '}
          {totalAmount.toLocaleString()}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Payment Date & Time</label>
            <input
              type="datetime-local"
              value={formData.paidAt}
              onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border rounded-none"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Transaction ID (Optional)</label>
            <input
              type="text"
              value={formData.transactionId}
              onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-none hover:bg-green-700"
            >
              Confirm Payment
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-none hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

