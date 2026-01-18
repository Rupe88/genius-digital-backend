'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { HiHome, HiBookOpen, HiChartBar, HiAcademicCap, HiCreditCard, HiHeart, HiCog } from 'react-icons/hi';
import { ROUTES } from '@/lib/utils/constants';

const menuItems = [
  { href: ROUTES.DASHBOARD, label: 'Overview', icon: HiHome },
  { href: `${ROUTES.DASHBOARD}/my-courses`, label: 'My Courses', icon: HiBookOpen },
  { href: `${ROUTES.DASHBOARD}/progress`, label: 'Progress', icon: HiChartBar },
  { href: `${ROUTES.DASHBOARD}/certificates`, label: 'Certificates', icon: HiAcademicCap },
  { href: `${ROUTES.DASHBOARD}/payments`, label: 'Payments', icon: HiCreditCard },
  { href: `${ROUTES.DASHBOARD}/wishlist`, label: 'Wishlist', icon: HiHeart },
  { href: `${ROUTES.DASHBOARD}/settings`, label: 'Settings', icon: HiCog },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = ROUTES.LOGIN;
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen sticky top-0">
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Dashboard</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{user?.fullName}</p>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[var(--primary-700)] text-white'
                          : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

