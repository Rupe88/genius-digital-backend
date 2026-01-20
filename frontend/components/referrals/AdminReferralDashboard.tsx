'use client';

import React, { useState, useEffect } from 'react';
import {
  getReferralAnalytics,
  getReferralConversions,
  markCommissionsAsPaid,
  ReferralAnalytics,
  ReferralConversion
} from '@/lib/api/referrals';
import { Pagination } from '@/lib/types/api';
import {
  FaLink,
  FaEye,
  FaUsers,
  FaDollarSign,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaFilter
} from 'react-icons/fa';
import toast from 'react-hot-toast';

export const AdminReferralDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedConversions, setSelectedConversions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    isFraudulent: '',
    page: 1,
    limit: 10
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadConversions();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsResult, conversionsResult] = await Promise.all([
        getReferralAnalytics(),
        getReferralConversions(filters)
      ]);

      setAnalytics(analyticsResult);
      setConversions(conversionsResult.data);
      setPagination(conversionsResult.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const loadConversions = async () => {
    try {
      const result = await getReferralConversions(filters);
      setConversions(result.data);
      setPagination(result.pagination);
    } catch (err) {
      toast.error('Failed to load conversions');
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleSelectConversion = (conversionId: string) => {
    setSelectedConversions(prev =>
      prev.includes(conversionId)
        ? prev.filter(id => id !== conversionId)
        : [...prev, conversionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedConversions.length === conversions.length) {
      setSelectedConversions([]);
    } else {
      setSelectedConversions(conversions.map(c => c.id));
    }
  };

  const handleMarkAsPaid = async () => {
    if (selectedConversions.length === 0) return;

    try {
      const result = await markCommissionsAsPaid(selectedConversions);
      toast.success(`Marked ${result.conversionsUpdated} commissions as paid (NPR ${(result.totalAmount || 0).toFixed(2)})`);

      // Refresh data
      await loadData();
      setSelectedConversions([]);
    } catch (err) {
      toast.error('Failed to mark commissions as paid');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };

    return `inline-flex px-2 py-1 text-xs font-semibold rounded-none ${styles[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const getFraudBadge = (isFraudulent: boolean) => {
    return isFraudulent ? (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-none bg-red-100 text-red-800">
        <FaExclamationTriangle className="w-3 h-3 mr-1" />
        Fraudulent
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-none bg-green-100 text-green-800">
        <FaCheck className="w-3 h-3 mr-1" />
        Clean
      </span>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-none"></div>
          ))}
        </div>
        <div className="bg-gray-200 h-96 rounded-none"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-none p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading referral data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-none text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Referral System Admin</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage referral conversions, commissions, and analytics
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-none border-l-4 border-blue-500">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaLink className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Links
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {analytics.totalLinks.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-none border-l-4 border-indigo-500">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaEye className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Clicks
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {analytics.totalClicks.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-none border-l-4 border-green-500">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUsers className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Conversions
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {analytics.totalConversions.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-none border-l-4 border-purple-500">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaDollarSign className="h-6 w-6 text-purple-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Commission
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      NPR {analytics.totalCommission?.toFixed(0) || '0'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-600 overflow-hidden shadow rounded-none">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-none bg-white/20 flex items-center justify-center">
                    <FaCheck className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-green-100">
                      Conversion Rate
                    </dt>
                    <dd className="text-2xl font-bold text-white">
                      {analytics.totalClicks > 0
                        ? ((analytics.totalConversions / analytics.totalClicks) * 100).toFixed(1)
                        : '0'}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversions Management */}
      <div className="bg-white shadow rounded-none">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Referral Conversions
            </h3>

            {selectedConversions.length > 0 && (
              <button
                onClick={handleMarkAsPaid}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-none text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <FaCheck className="w-4 h-4 mr-2" />
                Mark {selectedConversions.length} as Paid
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-none"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fraud Status
              </label>
              <select
                value={filters.isFraudulent}
                onChange={(e) => handleFilterChange({ isFraudulent: e.target.value })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-none"
              >
                <option value="">All</option>
                <option value="false">Clean</option>
                <option value="true">Fraudulent</option>
              </select>
            </div>
          </div>

          {/* Conversions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedConversions.length === conversions.length && conversions.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-none"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Converted User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fraud Check
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversions.map((conversion) => (
                  <tr key={conversion.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedConversions.includes(conversion.id)}
                        onChange={() => handleSelectConversion(conversion.id)}
                        disabled={conversion.status !== 'PENDING' || conversion.isFraudulent}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-none disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {conversion.referralLink?.user?.fullName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {conversion.referralLink?.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {conversion.referralLink?.course?.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        NPR {conversion.referralLink?.course?.price}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {conversion.convertedBy?.fullName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {conversion.convertedBy?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      NPR {conversion.commissionAmount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conversion.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getFraudBadge(conversion.isFraudulent)}
                      {conversion.fraudReason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={conversion.fraudReason}>
                          {conversion.fraudReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(conversion.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {conversions.length === 0 && (
            <div className="text-center py-8">
              <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.status || filters.isFraudulent ? 'Try adjusting your filters' : 'Conversions will appear here when users enroll through referral links'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handleFilterChange({ page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-none text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange({ page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-none text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                    <span className="font-medium">{pagination.pages}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReferralDashboard;
