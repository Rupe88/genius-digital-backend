'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiX } from 'react-icons/hi';
import { popupsApi, Popup } from '@/lib/api/popups';

export default function PromotionalPopup() {
    const [popup, setPopup] = useState<Popup | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchPopup = async () => {
            try {
                const response = await popupsApi.getActive();
                if (response.success && response.data) {
                    const activePopup = response.data;

                    // Check if this specific popup has been seen
                    const seenKey = `popup_seen_${activePopup.id}`;
                    const hasSeen = localStorage.getItem(seenKey);

                    if (!hasSeen) {
                        setPopup(activePopup);
                        // Slight delay for better UX
                        setTimeout(() => setIsVisible(true), 1500);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch promotional popup', error);
            }
        };

        fetchPopup();
    }, []);

    const handleClose = () => {
        if (popup) {
            setIsVisible(false);
            localStorage.setItem(`popup_seen_${popup.id}`, 'true');
        }
    };

    if (!popup || !isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl animate-in fade-in zoom-in duration-300">
                <button
                    onClick={handleClose}
                    className="absolute -top-3 -right-3 p-2 bg-white text-gray-800 rounded-full shadow-lg hover:bg-gray-100 transition-colors z-10"
                >
                    <HiX className="w-5 h-5" />
                </button>

                <div className="relative w-full aspect-[4/5] sm:aspect-square overflow-hidden rounded-lg">
                    {popup.linkUrl ? (
                        <Link href={popup.linkUrl} onClick={handleClose}>
                            <Image
                                src={popup.imageUrl}
                                alt={popup.title}
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 768px) 100vw, 500px"
                            />
                        </Link>
                    ) : (
                        <Image
                            src={popup.imageUrl}
                            alt={popup.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 500px"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
