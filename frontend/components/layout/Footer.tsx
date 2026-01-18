import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiFacebook,
  FiInstagram,
  FiYoutube,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiMapPin,
} from 'react-icons/fi';
import { FaGooglePlay, FaApple } from 'react-icons/fa';
import { ROUTES } from '@/lib/utils/constants';

const categories = [
  'Vastu',
  'Numerology',
  'Money and Wealth',
  'NLP',
  'Law of Attraction',
  'SWAR VIGYAN',
  'Graphology',
  'Astrology',
  'Navaratri Shakti Sadhana',
  'BUSINESS GROWTH',
];

const usefulLinks = [
  { label: 'About Us', href: ROUTES.HOME },
  { label: 'Courses', href: ROUTES.COURSES },
  { label: 'Privacy Statement', href: '/privacy' },
  { label: 'Terms & Condition', href: '/terms' },
  { label: 'Articles', href: ROUTES.BLOG },
  { label: 'Contact Us', href: ROUTES.CONTACT },
];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#0d1625] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
          {/* Brand + Social */}
          <div className="flex flex-col items-start gap-6">
            <div className="relative h-28 w-28">
              <Image
                src="/sanskar-academy-logo.jpeg"
                alt="Sanskar Academy logo"
                fill
                className="object-contain"
                sizes="112px"
                priority
              />
            </div>
            <div className="flex items-center gap-3 text-xl">
              <a
                href="https://facebook.com"
                aria-label="Facebook"
                className="transition hover:text-white/70"
              >
                <FiFacebook />
              </a>
              <a
                href="https://instagram.com"
                aria-label="Instagram"
                className="transition hover:text-white/70"
              >
                <FiInstagram />
              </a>
              <a
                href="https://youtube.com"
                aria-label="YouTube"
                className="transition hover:text-white/70"
              >
                <FiYoutube />
              </a>
              <a
                href="https://linkedin.com"
                aria-label="LinkedIn"
                className="transition hover:text-white/70"
              >
                <FiLinkedin />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4 text-sm">
            <h4 className="text-lg font-semibold tracking-wide relative">
              Categories
              <span className="mt-2 block h-0.5 w-16 bg-white/60" />
            </h4>
            <ul className="space-y-2 text-gray-100/80">
              {categories.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Useful links */}
          <div className="space-y-4 text-sm">
            <h4 className="text-lg font-semibold tracking-wide relative">
              Useful Links
              <span className="mt-2 block h-0.5 w-16 bg-white/60" />
            </h4>
            <ul className="space-y-2 text-gray-100/80">
              {usefulLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Student Support */}
          <div className="space-y-4 text-sm">
            <h4 className="text-lg font-semibold tracking-wide relative">
              Student Support
              <span className="mt-2 block h-0.5 w-16 bg-white/60" />
            </h4>
            <div className="space-y-3 text-gray-100/80">
              <div className="flex items-start gap-2">
                <FiMail className="mt-0.5 text-base" />
                <a
                  href="mailto:sanskaracademy555@gmail.com"
                  className="transition hover:text-white"
                >
                  sanskaracademy555@gmail.com
                </a>
              </div>
              <div className="flex items-start gap-2">
                <FiPhone className="mt-0.5 text-base" />
                <div className="space-y-1">
                  <a href="tel:+9779705231255" className="transition hover:text-white">
                    +977 9705231255
                  </a>
                  <a href="tel:+9779763694355" className="transition hover:text-white">
                    +977 9763694355
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FiMapPin className="mt-0.5 text-base" />
                <p>
                  New baneshwor, thapagaun Kathmandu
                </p>
              </div>
            </div>
          </div>

          {/* Download our app */}
          <div className="space-y-4 text-sm">
            <h4 className="text-lg font-semibold tracking-wide relative">
              Download Our App
              <span className="mt-2 block h-0.5 w-16 bg-white/60" />
            </h4>
            <div className="space-y-3">
              <a
                href="https://play.google.com"
                className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
                target="_blank"
                rel="noreferrer"
              >
                <FaGooglePlay className="text-2xl" />
                <div>
                  <p className="text-xs text-gray-200/80">Get on</p>
                  <p className="text-sm font-semibold">Play Store</p>
                </div>
              </a>
              <a
                href="https://www.apple.com/app-store/"
                className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
                target="_blank"
                rel="noreferrer"
              >
                <FaApple className="text-2xl" />
                <div>
                  <p className="text-xs text-gray-200/80">Get On</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-[#0a111d]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 py-4 text-xs text-gray-300 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p className="text-center sm:text-left">
            &copy; {year} sanskar academy. All rights reserved
          </p>
          <p className="text-center sm:text-right">
            Powered By floSoftwares
          </p>
        </div>
      </div>
    </footer>
  );
};
