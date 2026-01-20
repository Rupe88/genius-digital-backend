'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';

export default function ProfitLossPage() {
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchProfitLoss();
  }, [startDate, endDate]);

  const fetchProfitLoss = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getProfitLoss({ startDate, endDate, format: 'json' });
      setProfitLoss(data.data);
    } catch (error) {
      console.error('Error fetching profit/loss:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      if (format === 'csv') {
        const csv = await adminApi.getProfitLoss({ startDate, endDate, format: 'csv' });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profit-loss-${startDate}-to-${endDate}.csv`;
        a.click();
      } else {
        const data = await adminApi.getProfitLoss({ startDate, endDate, format: 'json' });
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profit-loss-${startDate}-to-${endDate}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting profit/loss:', error);
      alert('Failed to export profit/loss statement');
    }
  };

  if (loading) {
    return (
      <div>
        <p className="text-center py-8">Loading profit/loss statement...</p>
      </div>
    );
  }

  if (!profitLoss) {
    return (
      <div>
        <p className="text-center py-8 text-[var(--muted-foreground)]">No data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Profit & Loss Statement</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Financial performance overview</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-green-600 text-white rounded-none hover:bg-green-700"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-none"
            />
          </div>
        </div>
      </Card>

      {/* P&L Statement */}
      <div className="space-y-6">
        {/* Revenue */}
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Revenue</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Course Sales</span>
              <span className="font-bold">Rs. {(profitLoss.revenue?.courseSales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Product Sales</span>
              <span className="font-bold">Rs. {(profitLoss.revenue?.productSales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Event Registrations</span>
              <span className="font-bold">Rs. {(profitLoss.revenue?.eventRegistrations || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-bold">Total Revenue</span>
              <span className="font-bold text-green-600">
                Rs. {(profitLoss.revenue?.totalRevenue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Cost of Goods Sold */}
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Cost of Goods Sold (COGS)</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Instructor Commissions</span>
              <span className="font-bold">Rs. {(profitLoss.costOfGoodsSold?.instructorCommissions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Affiliate Commissions</span>
              <span className="font-bold">Rs. {(profitLoss.costOfGoodsSold?.affiliateCommissions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-bold">Total COGS</span>
              <span className="font-bold text-red-600">
                Rs. {(profitLoss.costOfGoodsSold?.totalCOGS || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card padding="lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Gross Profit</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                Rs. {(profitLoss.grossProfit || 0).toLocaleString()}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Margin: {profitLoss.grossProfitMargin?.toFixed(2) || 0}%
              </p>
            </div>
          </div>
        </Card>

        {/* Operating Expenses */}
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Operating Expenses</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Marketing</span>
              <span>Rs. {(profitLoss.operatingExpenses?.marketing || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Infrastructure</span>
              <span>Rs. {(profitLoss.operatingExpenses?.infrastructure || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Software</span>
              <span>Rs. {(profitLoss.operatingExpenses?.software || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Hardware</span>
              <span>Rs. {(profitLoss.operatingExpenses?.hardware || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Office Rent</span>
              <span>Rs. {(profitLoss.operatingExpenses?.officeRent || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Utilities</span>
              <span>Rs. {(profitLoss.operatingExpenses?.utilities || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance</span>
              <span>Rs. {(profitLoss.operatingExpenses?.insurance || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Professional Services</span>
              <span>Rs. {(profitLoss.operatingExpenses?.professionalServices || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Travel</span>
              <span>Rs. {(profitLoss.operatingExpenses?.travel || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Training</span>
              <span>Rs. {(profitLoss.operatingExpenses?.training || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Other</span>
              <span>Rs. {(profitLoss.operatingExpenses?.other || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-bold">Total Operating Expenses</span>
              <span className="font-bold text-red-600">
                Rs. {(profitLoss.operatingExpenses?.totalOperatingExpenses || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Net Profit/Loss */}
        <Card padding="lg" className={profitLoss.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Net Profit/Loss</h2>
            <div className="text-right">
              <p className={`text-3xl font-bold ${profitLoss.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {(profitLoss.netProfit || 0).toLocaleString()}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Margin: {profitLoss.netProfitMargin?.toFixed(2) || 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

