'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';
import Link from 'next/link';
import { ROUTES } from '@/lib/utils/constants';
import { HiCurrencyDollar, HiArrowUp, HiArrowDown, HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

export default function AdminFinancePage() {
  const [financialOverview, setFinancialOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialOverview();
  }, []);

  const fetchFinancialOverview = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFinancialOverview();
      setFinancialOverview(data);
    } catch (error) {
      console.error('Error fetching financial overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const profitColor = financialOverview?.profit?.today >= 0 ? 'text-green-600' : 'text-red-600';
  const ProfitIcon = financialOverview?.profit?.today >= 0 ? HiTrendingUp : HiTrendingDown;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Finance Dashboard</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Financial overview and analytics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Today's Revenue</p>
              <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
                {loading ? '...' : `Rs. ${(financialOverview?.revenue?.today || 0).toLocaleString()}`}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-none">
              <HiCurrencyDollar className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Monthly Revenue</p>
              <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
                {loading ? '...' : `Rs. ${(financialOverview?.revenue?.thisMonth || 0).toLocaleString()}`}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-none">
              <HiTrendingUp className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Today's Expenses</p>
              <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
                {loading ? '...' : `Rs. ${(financialOverview?.expenses?.today || 0).toLocaleString()}`}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-none">
              <HiArrowDown className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Today's Profit</p>
              <p className={`text-2xl font-bold mt-1 ${profitColor}`}>
                {loading ? '...' : `Rs. ${(financialOverview?.profit?.today || 0).toLocaleString()}`}
              </p>
            </div>
            <div className={`p-3 rounded-none ${financialOverview?.profit?.today >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <ProfitIcon className={`h-6 w-6 ${profitColor}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Revenue Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Today</span>
              <span className="font-bold">Rs. {(financialOverview?.revenue?.today || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">This Week</span>
              <span className="font-bold">Rs. {(financialOverview?.revenue?.thisWeek || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">This Month</span>
              <span className="font-bold">Rs. {(financialOverview?.revenue?.thisMonth || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">This Year</span>
              <span className="font-bold">Rs. {(financialOverview?.revenue?.thisYear || 0).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Pending Payments</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Pending Salaries</span>
              <span className="font-bold text-yellow-600">
                Rs. {(financialOverview?.pendingSalaries || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Pending Expenses</span>
              <span className="font-bold text-yellow-600">
                Rs. {(financialOverview?.pendingExpenses || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="text-[var(--muted-foreground)] font-semibold">Total Pending</span>
              <span className="font-bold text-red-600">
                Rs. {(financialOverview?.pendingExpenses || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`${ROUTES.ADMIN}/finance/profit-loss`}
            className="px-4 py-3 bg-blue-600 text-white rounded-none hover:bg-blue-700 text-center"
          >
            View Profit/Loss Statement
          </Link>
          <Link
            href={`${ROUTES.ADMIN}/expenses`}
            className="px-4 py-3 bg-green-600 text-white rounded-none hover:bg-green-700 text-center"
          >
            Manage Expenses
          </Link>
          <Link
            href={`${ROUTES.ADMIN}/finance/salaries`}
            className="px-4 py-3 bg-purple-600 text-white rounded-none hover:bg-purple-700 text-center"
          >
            Manage Salaries
          </Link>
        </div>
      </Card>
    </div>
  );
}

