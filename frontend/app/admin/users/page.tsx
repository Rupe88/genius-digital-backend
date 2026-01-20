
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as adminApi from '@/lib/api/admin';
import { User } from '@/lib/types/auth';
import { PaginatedResponse } from '@/lib/types/api';
import { formatDate } from '@/lib/utils/helpers';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data: PaginatedResponse<User> = await adminApi.getAllUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });
      setUsers(data?.data || []);
      setPagination(data?.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error fetching users:', error);
      // Set empty array on error to prevent undefined errors
      setUsers([]);
      setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
      alert(`Failed to load users: ${Object(error).message || 'An error occurred' || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await adminApi.blockUser(userId);
      } else {
        await adminApi.unblockUser(userId);
      }
      fetchUsers();
    } catch (error) {
      alert(Object(error).message || 'An error occurred' || 'Operation failed');
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">User Management</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Manage all users</p>
        </div>
        <Input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination({ ...pagination, page: 1 });
          }}
          className="max-w-md"
        />
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Loading...</td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--muted)]">
                    <td className="px-6 py-4 whitespace-nowrap">{user.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-none text-xs ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'INSTRUCTOR' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-none text-xs ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role !== 'ADMIN' && (
                        <Button
                          variant={user.isActive ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleBlock(user.id, user.isActive)}
                        >
                          {user.isActive ? 'Block' : 'Unblock'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-[var(--muted-foreground)]">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
            <div className="text-sm text-[var(--muted-foreground)]">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

