'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { useCart } from '@/lib/context/CartContext';
import { ROUTES } from '@/lib/utils/constants';
import { HiMenu, HiX, HiUser, HiLogout, HiCog, HiShoppingCart } from 'react-icons/hi';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const navItems = [
    { label: 'Home', href: ROUTES.HOME },
    { label: 'Consultation', href: ROUTES.CONSULTATION },
    { label: 'Courses', href: ROUTES.COURSES },
    { label: 'Live Classes', href: ROUTES.LIVE_CLASSES },
    { label: 'Vastu Product', href: ROUTES.VASTU_PRODUCT },
    { label: 'Events', href: ROUTES.EVENTS },
    { label: 'Blogs', href: ROUTES.BLOGS },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center flex-shrink-0">
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              <Image
                src="/sanskar-academy-logo.jpeg"
                alt="Sanskar Academy"
                fill
                className="object-contain rounded-none"
                sizes="(max-width: 768px) 64px, 80px"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-6 xl:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-red-600 transition-colors font-medium text-base whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}

            <div className="flex items-center space-x-3 ml-6">
              {/* Cart icon - always visible */}
              <Link href="/cart" className="relative flex items-center text-gray-700 hover:text-red-600">
                <HiShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-none bg-red-600 px-1 text-xs font-semibold text-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {/* Become Affiliate button - always visible */}
              <Link href={ROUTES.AFFILIATE}>
                <button className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-600 rounded-none hover:bg-red-50 transition-colors whitespace-nowrap">
                  Become A Affiliate
                </button>
              </Link>

              {/* Auth buttons / user menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <HiUser className="h-5 w-5" />
                    <span className="hidden xl:inline">{user?.fullName || 'User'}</span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-none shadow-lg py-1 z-50 border border-gray-200">
                      <Link
                        href={ROUTES.DASHBOARD}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <HiCog className="inline mr-2" />
                        Dashboard
                      </Link>
                      <Link
                        href="/dashboard/referrals"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        💰 My Referrals
                      </Link>
                      {user?.role === 'ADMIN' && (
                        <>
                          <Link
                            href={ROUTES.ADMIN}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Admin Panel
                          </Link>
                          <Link
                            href="/admin/referrals"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            📊 Referral Admin
                          </Link>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <HiLogout className="inline mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href={ROUTES.LOGIN}>
                    <button className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-600 rounded-none hover:bg-red-50 transition-colors whitespace-nowrap">
                      Login
                    </button>
                  </Link>
                  <Link href={ROUTES.REGISTER}>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-none hover:bg-red-700 transition-colors whitespace-nowrap">
                      Register
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-gray-700 p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-none font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  href={ROUTES.DASHBOARD}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-none"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    href={ROUTES.ADMIN}
                    className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-none"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-none"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="pt-2 space-y-2">
                <Link
                  href={ROUTES.LOGIN}
                  className="block px-3 py-2 text-center text-sm font-medium text-red-600 bg-white border border-red-600 rounded-none hover:bg-red-50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href={ROUTES.REGISTER}
                  className="block px-3 py-2 text-center text-sm font-medium text-white bg-red-600 rounded-none hover:bg-red-700 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
                <Link
                  href={ROUTES.AFFILIATE}
                  className="block px-3 py-2 text-center text-sm font-medium text-red-600 bg-white border border-red-600 rounded-none hover:bg-red-50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Become A Affiliate
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

