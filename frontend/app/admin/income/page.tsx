'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';

export default function IncomeTrackingPage() {
  const [incomeData, setIncomeData] = useState<adminApi.IncomeBreakdown | null>(null);
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
    fetchIncomeData();
  }, [startDate, endDate]);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getIncomeBreakdown({ startDate, endDate });
      setIncomeData(data);
    } catch (error) {
      console.error('Error fetching income data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <p className="text-center py-8">Loading income data...</p>
      </div>
    );
  }

  if (!incomeData) {
    return (
      <div>
        <p className="text-center py-8 text-[var(--muted-foreground)]">No income data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Income Tracking</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Income breakdown and analysis</p>
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

      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card padding="lg">
          <p className="text-sm text-[var(--muted-foreground)]">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            Rs. {(incomeData.totalRevenue || 0).toLocaleString()}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-sm text-[var(--muted-foreground)]">Course Sales</p>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
            Rs. {(incomeData.courseSales || 0).toLocaleString()}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-sm text-[var(--muted-foreground)]">Product Sales</p>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
            Rs. {(incomeData.productSales || 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Income Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Income Sources</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Course Sales</span>
              <span className="font-bold">Rs. {(incomeData.courseSales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Product Sales</span>
              <span className="font-bold">Rs. {(incomeData.productSales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Event Registrations</span>
              <span className="font-bold">Rs. {(incomeData.eventRegistrations || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-bold">Total Revenue</span>
              <span className="font-bold text-green-600">
                Rs. {(incomeData.totalRevenue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
          <div className="space-y-4">
            {incomeData.paymentMethodBreakdown &&
              Object.entries(incomeData.paymentMethodBreakdown).map(([method, amount]: [string, any]) => (
                <div key={method} className="flex justify-between">
                  <span>{method.replace('_', ' ')}</span>
                  <span className="font-bold">Rs. {parseFloat(amount.toString()).toLocaleString()}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Top Courses */}
      {incomeData.courseSalesDetail && incomeData.courseSalesDetail.length > 0 && (
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4">Top Revenue Generating Courses</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Course</th>
                  <th className="text-right py-3 px-4">Revenue</th>
                  <th className="text-right py-3 px-4">Sales Count</th>
                </tr>
              </thead>
              <tbody>
                {incomeData.courseSalesDetail.slice(0, 10).map((course: any) => (
                  <tr key={course.courseId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{course.courseTitle}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      Rs. {parseFloat(course.total.toString()).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">{course.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

