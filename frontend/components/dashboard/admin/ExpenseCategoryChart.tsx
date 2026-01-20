'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface ExpenseCategoryChartProps {
  data: Record<string, number>;
}

export const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({ data }) => {
  const total = Object.values(data).reduce((sum, amount) => sum + parseFloat(amount.toString()), 0);

  const categories = Object.entries(data)
    .map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toString()),
      percentage: total > 0 ? (parseFloat(amount.toString()) / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <Card padding="lg">
      <h2 className="text-xl font-bold mb-4">Expenses by Category</h2>
      <div className="space-y-3">
        {categories.map((item) => (
          <div key={item.category}>
            <div className="flex justify-between mb-1">
              <span className="text-sm">{item.category.replace('_', ' ')}</span>
              <span className="text-sm font-semibold">Rs. {item.amount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-none h-2">
              <div
                className="bg-blue-600 h-2 rounded-none transition-all"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{(item.percentage || 0).toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between font-bold">
          <span>Total Expenses</span>
          <span className="text-red-600">Rs. {total.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
};

