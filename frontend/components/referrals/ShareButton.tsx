'use client';

import React, { useState } from 'react';
import { generateSharingLinks, SocialSharing, SharingLinks } from '@/lib/api/referrals';
import { FaShare, FaFacebook, FaLinkedin, FaTwitter, FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/utils/constants';

interface ShareButtonProps {
  courseId: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string;
  };
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  courseId,
  course,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sharingData, setSharingData] = useState<SharingLinks | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to share and earn');
      router.push(`${ROUTES.LOGIN}?redirect=/courses/${courseId}`);
      return;
    }

    if (!sharingData) {
      setLoading(true);
      try {
        const result = await generateSharingLinks(courseId);
        setSharingData(result);
        setShowModal(true);
      } catch (error) {
        toast.error('Failed to generate sharing links');
        console.error('Share error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCopyLink = async () => {
    if (sharingData?.shareUrl) {
      const success = await SocialSharing.copyToClipboard(sharingData.shareUrl);
      if (success) {
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleSocialShare = (platform: string) => {
    if (sharingData?.shareUrl) {
      SocialSharing.shareOnPlatform(sharingData.shareUrl, platform);
      toast.success(`Shared on ${platform}!`);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
  };

  return (
    <>
      {/* Share Button */}
      <button
        onClick={handleShare}
        disabled={loading}
        className={getButtonClasses()}
      >
        {loading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-none h-4 w-4 border-b-2 border-current mr-2"></div>
            Generating...
          </div>
        ) : (
          <>
            <FaShare className="w-4 h-4 mr-2" />
            Share & Earn 10%
          </>
        )}
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-none text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Share "{course.title}"
                    </h3>

                    {/* Referral Stats */}
                    <div className="bg-blue-50 border border-blue-200 rounded-none p-4 mb-4">
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Earn 10% commission when friends enroll!</p>
                        <p className="text-xs mt-1">
                          Share this link and get paid for each successful enrollment.
                        </p>
                      </div>
                    </div>

                    {/* Share URL */}
                    {sharingData?.shareUrl && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Share this link:
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            value={sharingData.shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-none bg-gray-50 text-sm"
                          />
                          <button
                            onClick={handleCopyLink}
                            className="px-4 py-2 border border-l-0 border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-none text-sm font-medium"
                          >
                            {copied ? <FaCheck className="w-4 h-4 text-green-600" /> : <FaCopy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Social Share Buttons */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Share on social media:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSocialShare('facebook')}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 text-sm font-medium"
                        >
                          <FaFacebook className="w-4 h-4 mr-2" />
                          Facebook
                        </button>

                        <button
                          onClick={() => handleSocialShare('linkedin')}
                          className="flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-none hover:bg-blue-800 text-sm font-medium"
                        >
                          <FaLinkedin className="w-4 h-4 mr-2" />
                          LinkedIn
                        </button>

                        <button
                          onClick={() => handleSocialShare('twitter')}
                          className="flex items-center justify-center px-4 py-2 bg-blue-400 text-white rounded-none hover:bg-blue-500 text-sm font-medium"
                        >
                          <FaTwitter className="w-4 h-4 mr-2" />
                          Twitter
                        </button>

                        <button
                          onClick={() => handleSocialShare('whatsapp')}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-none hover:bg-green-700 text-sm font-medium"
                        >
                          <FaWhatsapp className="w-4 h-4 mr-2" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-none border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;
