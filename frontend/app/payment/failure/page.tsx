'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HiXCircle } from 'react-icons/hi';
import { ROUTES } from '@/lib/utils/constants';

export default function PaymentFailurePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-8 bg-white shadow-xl rounded-none border border-gray-100">
                <div className="space-y-6">
                    <div className="bg-red-50 w-24 h-24 rounded-none flex items-center justify-center mx-auto">
                        <HiXCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Payment Failed</h1>
                    <p className="text-gray-600 leading-relaxed">
                        We couldn't process your payment. This might be due to a technical issue or insufficient funds.
                    </p>

                    <div className="space-y-3 pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full h-12 text-lg shadow-lg shadow-primary-500/20"
                            onClick={() => router.push(ROUTES.COURSES)}
                        >
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full h-12 text-lg"
                            onClick={() => router.push('/')}
                        >
                            Back to Home
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
