'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HiCheckCircle, HiXCircle, HiRefresh } from 'react-icons/hi';
import * as paymentApi from '@/lib/api/payments';
import { ROUTES } from '@/lib/utils/constants';
import { formatCurrency } from '@/lib/utils/helpers';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [verifying, setVerifying] = useState(true);
    const [status, setStatus] = useState<'success' | 'failed' | 'error'>('success');
    const [message, setMessage] = useState('Verifying your payment...');
    const [paymentData, setPaymentData] = useState<any>(null);

    useEffect(() => {
        const data = searchParams.get('data');
        if (data) {
            verifyPayment(data);
        } else {
            setVerifying(false);
            setStatus('error');
            setMessage('No payment data received from eSewa');
        }
    }, [searchParams]);

    const verifyPayment = async (encodedData: string) => {
        try {
            setVerifying(true);
            // eSewa v2 sends base64 encoded JSON in 'data' param
            const decodedData = JSON.parse(atob(encodedData));
            console.log('Decoded eSewa data:', decodedData);

            const result = await paymentApi.verifyPayment(
                decodedData.transaction_uuid,
                'ESEWA'
            );

            setPaymentData(result);
            setStatus('success');
            setMessage('Your payment has been successfully verified! You are now enrolled.');
        } catch (error) {
            console.error('Verification error:', error);
            setStatus('failed');
            setMessage(Object(error).message || 'Payment verification failed');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-8 bg-white shadow-xl rounded-none border border-gray-100">
                {verifying ? (
                    <div className="space-y-6">
                        <HiRefresh className="w-16 h-16 text-[var(--primary-700)] animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold text-gray-900">Verifying Payment</h1>
                        <p className="text-gray-600">{message}</p>
                    </div>
                ) : status === 'success' ? (
                    <div className="space-y-6">
                        <div className="bg-green-50 w-24 h-24 rounded-none flex items-center justify-center mx-auto">
                            <HiCheckCircle className="w-16 h-16 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Payment Successful!</h1>
                        <p className="text-gray-600 leading-relaxed">{message}</p>

                        {paymentData && (
                            <div className="bg-gray-50 rounded-none p-4 text-left space-y-2 mb-6 border border-gray-200">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Transaction ID:</span>
                                    <span className="font-semibold text-gray-900">{paymentData.transactionId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Amount Paid:</span>
                                    <span className="font-semibold text-gray-900">Rs. {paymentData.amount.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full h-12 text-lg shadow-lg shadow-primary-500/20"
                                onClick={() => router.push(ROUTES.DASHBOARD)}
                            >
                                Go to My Courses
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-red-50 w-24 h-24 rounded-none flex items-center justify-center mx-auto">
                            <HiXCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Verification Failed</h1>
                        <p className="text-red-600 bg-red-50 p-4 rounded-none border border-red-100">{message}</p>

                        <div className="pt-4 space-y-3">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full h-12 text-lg"
                                onClick={() => router.push(ROUTES.COURSES)}
                            >
                                Back to Courses
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full h-12 text-lg"
                                onClick={() => window.location.reload()}
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 bg-white shadow-xl rounded-none border border-gray-100">
                    <div className="space-y-6">
                        <HiRefresh className="w-16 h-16 text-[var(--primary-700)] animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
                    </div>
                </Card>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
