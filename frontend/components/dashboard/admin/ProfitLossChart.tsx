'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface ProfitLossChartProps {
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
}

export const ProfitLossChart: React.FC<ProfitLossChartProps> = ({
  revenue,
  expenses,
  grossProfit,
  netProfit,
}) => {
  const maxValue = Math.max(revenue, Math.abs(expenses), Math.abs(netProfit));
  const revenueBarWidth = maxValue > 0 ? (revenue / maxValue) * 100 : 0;
  const expensesBarWidth = maxValue > 0 ? (Math.abs(expenses) / maxValue) * 100 : 0;
  const netProfitBarWidth = maxValue > 0 ? (Math.abs(netProfit) / maxValue) * 100 : 0;

  return (
    <Card padding="lg">
      <h2 className="text-xl font-bold mb-4">Profit & Loss Overview</h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Revenue</span>
            <span className="text-sm font-bold text-green-600">Rs. {revenue.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-none h-4">
            <div
              className="bg-green-600 h-4 rounded-none transition-all"
              style={{ width: `${revenueBarWidth}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Expenses</span>
            <span className="text-sm font-bold text-red-600">Rs. {expenses.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-none h-4">
            <div
              className="bg-red-600 h-4 rounded-none transition-all"
              style={{ width: `${expensesBarWidth}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Gross Profit</span>
            <span className={`text-sm font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {grossProfit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-none h-4">
            <div
              className={`h-4 rounded-none transition-all ${grossProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(0, (Math.abs(grossProfit) / maxValue) * 100)}%` }}
            />
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="flex justify-between mb-1">
            <span className="text-lg font-bold">Net Profit/Loss</span>
            <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {netProfit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-none h-6">
            <div
              className={`h-6 rounded-none transition-all ${netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
              style={{ width: `${Math.max(0, (Math.abs(netProfit) / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

