'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { HiHome, HiUsers, HiBookOpen, HiFolder, HiUserGroup, HiCreditCard, HiTag, HiShoppingBag, HiDocumentText, HiPhotograph, HiChat, HiQuestionMarkCircle, HiCalendar, HiVideoCamera, HiClipboardList, HiAcademicCap, HiChartBar, HiBell, HiStar, HiMail, HiShieldCheck, HiCash, HiCurrencyDollar, HiTrendingUp, HiOfficeBuilding, HiChevronDown, HiChevronRight, HiShare } from 'react-icons/hi';
import { ROUTES } from '@/lib/utils/constants';

interface MenuItem {
  href: string;
  label: string;
  icon: any;
}

interface MenuCategory {
  label: string;
  icon: any;
  items: MenuItem[];
}

const adminMenuCategories: MenuCategory[] = [
  {
    label: 'Dashboard',
    icon: HiHome,
    items: [
      { href: ROUTES.ADMIN, label: 'Overview', icon: HiHome },
    ]
  },
  {
    label: 'User Management',
    icon: HiUsers,
    items: [
      { href: `${ROUTES.ADMIN}/users`, label: 'Users', icon: HiUsers },
      { href: `${ROUTES.ADMIN}/instructors`, label: 'Instructors', icon: HiUserGroup },
    ]
  },
  {
    label: 'Course Management',
    icon: HiBookOpen,
    items: [
      { href: `${ROUTES.ADMIN}/courses`, label: 'Courses', icon: HiBookOpen },
      { href: `${ROUTES.ADMIN}/categories`, label: 'Categories', icon: HiFolder },
      { href: `${ROUTES.ADMIN}/enrollments`, label: 'Enrollments', icon: HiBookOpen },
      { href: `${ROUTES.ADMIN}/certificates`, label: 'Certificates', icon: HiAcademicCap },
      { href: `${ROUTES.ADMIN}/assignments`, label: 'Assignments', icon: HiClipboardList },
      { href: `${ROUTES.ADMIN}/quizzes`, label: 'Quizzes', icon: HiClipboardList },
    ]
  },
  {
    label: 'Content Management',
    icon: HiDocumentText,
    items: [
      { href: `${ROUTES.ADMIN}/blogs`, label: 'Blog', icon: HiDocumentText },
      { href: `${ROUTES.ADMIN}/testimonials`, label: 'Testimonials', icon: HiStar },
      { href: `${ROUTES.ADMIN}/gallery`, label: 'Gallery', icon: HiPhotograph },
      { href: `${ROUTES.ADMIN}/faqs`, label: 'FAQs', icon: HiQuestionMarkCircle },
      { href: `${ROUTES.ADMIN}/events`, label: 'Events', icon: HiCalendar },
      { href: `${ROUTES.ADMIN}/live-classes`, label: 'Live Classes', icon: HiVideoCamera },
      { href: `${ROUTES.ADMIN}/popups`, label: 'Popups', icon: HiPhotograph },
    ]
  },
  {
    label: 'E-commerce',
    icon: HiShoppingBag,
    items: [
      { href: `${ROUTES.ADMIN}/products`, label: 'Products', icon: HiShoppingBag },
      { href: `${ROUTES.ADMIN}/orders`, label: 'Orders', icon: HiShoppingBag },
      { href: `${ROUTES.ADMIN}/coupons`, label: 'Coupons', icon: HiTag },
    ]
  },
  {
    label: 'Finance',
    icon: HiCurrencyDollar,
    items: [
      { href: `${ROUTES.ADMIN}/finance`, label: 'Finance Overview', icon: HiCurrencyDollar },
      { href: `${ROUTES.ADMIN}/payments`, label: 'Payments', icon: HiCreditCard },
      { href: `${ROUTES.ADMIN}/expenses`, label: 'Expenses', icon: HiCash },
      { href: `${ROUTES.ADMIN}/income`, label: 'Income', icon: HiTrendingUp },
      { href: `${ROUTES.ADMIN}/finance/salaries`, label: 'Salaries', icon: HiOfficeBuilding },
    ]
  },
  {
    label: 'Communication',
    icon: HiChat,
    items: [
      { href: `${ROUTES.ADMIN}/consultations`, label: 'Consultations', icon: HiChat },
      { href: `${ROUTES.ADMIN}/contact-submissions`, label: 'Contact Submissions', icon: HiMail },
      { href: `${ROUTES.ADMIN}/newsletter`, label: 'Newsletter', icon: HiMail },
      { href: `${ROUTES.ADMIN}/notifications`, label: 'Notifications', icon: HiBell },
    ]
  },
  {
    label: 'Analytics & Tools',
    icon: HiChartBar,
    items: [
      { href: `${ROUTES.ADMIN}/affiliates`, label: 'Affiliates', icon: HiChartBar },
      { href: `${ROUTES.ADMIN}/referrals`, label: 'Referrals', icon: HiShare },
      { href: `${ROUTES.ADMIN}/student-success`, label: 'Student Success', icon: HiStar },
      { href: `${ROUTES.ADMIN}/audit-logs`, label: 'Audit Logs', icon: HiShieldCheck },
    ]
  },
  {
    label: 'Account',
    icon: HiShieldCheck,
    items: [
      { href: `${ROUTES.ADMIN}/account`, label: 'Account Settings', icon: HiShieldCheck },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuth();
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Dashboard']));

  console.log('AdminLayout render:', { pathname, isAuthenticated, loading });

  const toggleCategory = (categoryLabel: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryLabel)) {
        newSet.delete(categoryLabel);
      } else {
        newSet.add(categoryLabel);
      }
      return newSet;
    });
  };

  // Check if a category should be open based on current path
  const isCategoryActive = (category: MenuCategory) => {
    return category.items.some(item =>
      pathname === item.href || pathname?.startsWith(item.href + '/')
    );
  };

  // Simplified category opening logic
  React.useEffect(() => {
    const activeCategory = adminMenuCategories.find(category => isCategoryActive(category));
    if (activeCategory && !openCategories.has(activeCategory.label)) {
      setOpenCategories(prev => new Set(prev).add(activeCategory.label));
    }
  }, [pathname]);

  // Don't apply auth check to login page
  const isLoginPage = pathname === `${ROUTES.ADMIN}/login`;

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    window.location.href = `${ROUTES.ADMIN}/login`;
    return null;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg flex-shrink-0 border-r border-gray-200 flex flex-col h-full">
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-600 mt-1">{user?.fullName}</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <ul className="space-y-1">
              {adminMenuCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isOpen = openCategories.has(category.label);
                const categoryActive = isCategoryActive(category);

                return (
                  <li key={category.label} className="mb-2">
                    {/* Category Header */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Toggling category:', category.label);
                        toggleCategory(category.label);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2 rounded-none transition-colors ${categoryActive
                        ? 'text-red-600 bg-red-50 border-l-4 border-red-600'
                        : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <CategoryIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      {isOpen ? (
                        <HiChevronDown className="h-4 w-4" />
                      ) : (
                        <HiChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* Category Items */}
                    {isOpen && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`flex items-center space-x-3 px-4 py-2 rounded-none transition-colors ${isActive
                                  ? 'text-red-600 bg-red-50 border-l-4 border-red-600'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-red-600'
                                  }`}
                              >
                                <ItemIcon className="h-4 w-4" />
                                <span className="text-sm">{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-white p-8 custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}

