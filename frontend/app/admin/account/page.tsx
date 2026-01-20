'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';

export default function AccountManagementPage() {
  const [accountOverview, setAccountOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchAccountOverview();
    fetchTransactions();
  }, [filters]);

  const fetchAccountOverview = async () => {
    try {
      const data = await adminApi.getAccountOverview();
      setAccountOverview(data.data);
    } catch (error) {
      console.error('Error fetching account overview:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllTransactions(filters);
      setTransactions(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const transactionTypes = ['INCOME', 'EXPENSE', 'SALARY', 'REFUND', 'COMMISSION'];
  const transactionCategories = [
    'COURSE_SALE',
    'PRODUCT_SALE',
    'INSTRUCTOR_COMMISSION',
    'AFFILIATE_COMMISSION',
    'MARKETING',
    'OPERATIONAL',
    'INFRASTRUCTURE',
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Account Management</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Transaction ledger and account balance</p>
      </div>

      {/* Account Balance */}
      {accountOverview?.balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card padding="lg">
            <p className="text-sm text-[var(--muted-foreground)]">Current Balance</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                accountOverview.balance.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              Rs. {accountOverview.balance.currentBalance?.toLocaleString() || 0}
            </p>
          </Card>
          <Card padding="lg">
            <p className="text-sm text-[var(--muted-foreground)]">Total Income</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              Rs. {accountOverview.balance.totalIncome?.toLocaleString() || 0}
            </p>
          </Card>
          <Card padding="lg">
            <p className="text-sm text-[var(--muted-foreground)]">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              Rs. {accountOverview.balance.totalExpenses?.toLocaleString() || 0}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-none"
            >
              <option value="">All Types</option>
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border rounded-none"
            >
              <option value="">All Categories</option>
              {transactionCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4">Transaction Ledger</h2>
        {loading ? (
          <p className="text-center py-8">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-8 text-[var(--muted-foreground)]">No transactions found</p>
        ) : (
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
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
              className="px-4 py-2 border rounded-none disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.pages}
              className="px-4 py-2 border rounded-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

