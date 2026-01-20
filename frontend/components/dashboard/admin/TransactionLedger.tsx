'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  transactionDate: string;
  referenceNumber?: string;
  payment?: any;
  expense?: any;
  instructorEarning?: any;
}

interface TransactionLedgerProps {
  transactions: Transaction[];
  loading?: boolean;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({ transactions, loading = false }) => {
  if (loading) {
    return (
      <Card padding="lg">
        <p className="text-center py-8">Loading transactions...</p>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-center py-8 text-[var(--muted-foreground)]">No transactions found</p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="text-right py-3 px-4">Amount</th>
              <th className="text-left py-3 px-4">Reference</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  {new Date(transaction.transactionDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-none text-xs ${
                      transaction.type === 'INCOME' || transaction.type === 'REFUND'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {transaction.type}
                  </span>
                </td>
                <td className="py-3 px-4">{transaction.category.replace('_', ' ')}</td>
                <td className="py-3 px-4">{transaction.description}</td>
                <td
                  className={`py-3 px-4 text-right font-semibold ${
                    transaction.type === 'INCOME' || transaction.type === 'REFUND'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'INCOME' || transaction.type === 'REFUND' ? '+' : '-'}Rs.{' '}
                  {parseFloat(transaction.amount.toString()).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--muted-foreground)]">
                  {transaction.referenceNumber || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

