'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { consultationApi, CreateConsultationRequest } from '@/lib/api/consultation';
import { studentSuccessApi, StudentSuccess } from '@/lib/api/studentSuccess';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea'; // Assuming this exists or I'll use native textarea
import { Select } from '@/components/ui/Select'; // Assuming this exists

export default function ConsultationPage() {
    const [isOnline, setIsOnline] = useState(true);
    const [successStories, setSuccessStories] = useState<StudentSuccess[]>([]);
    const [sidebarLoading, setSidebarLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateConsultationRequest>();

    useEffect(() => {
        const fetchSuccessStories = async () => {
            try {
                const response = await studentSuccessApi.getAll();
                // Filter for published stories, sort by latest or featured
                const stories = response.data || [];
                const publishedStories = stories
                    .filter(s => s.isPublished)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5); // Take top 5
                setSuccessStories(publishedStories);
            } catch (error) {
                console.error('Failed to fetch success stories', error);
            } finally {
                setSidebarLoading(false);
            }
        };

        fetchSuccessStories();
    }, []);

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            // Prepare payload
            const topic = data.topic ? `Topic: ${data.topic}\n` : '';
            const payload = {
                ...data,
                message: `${topic}${data.message}`,
                consultationType: isOnline ? 'ONLINE' : 'OFFLINE',
                // default status is PENDING
            };

            await consultationApi.create(payload);
            toast.success('Consultation request submitted successfully! We will contact you soon.');
            reset();
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit consultation request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb / Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Consultation</h1>
                    <p className="mt-2 text-gray-600">Get expert advice from our professionals.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content: Consultation Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Book a Consultation</h2>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                                {/* Consultation Type Radio - Just UI, we send as part of payload or mapped */}
                                <div className="flex items-center space-x-6 mb-6 justify-center">
                                    {/* Radio buttons controlled by isOnline state, derived payload uses this */}
                                    <label className="text-gray-700 font-medium mr-2">Consultation Mode:</label>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            className="form-radio text-[var(--primary-700)] focus:ring-[var(--primary-700)]"
                                            checked={isOnline}
                                            onChange={() => setIsOnline(true)}
                                        />
                                        <span className="ml-2">Online</span>
                                    </label>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            className="form-radio text-[var(--primary-700)] focus:ring-[var(--primary-700)]"
                                            checked={!isOnline}
                                            onChange={() => setIsOnline(false)}
                                        />
                                        <span className="ml-2">Offline</span>
                                    </label>
                                </div>

                                <div className="space-y-4">
                                    {/* Name */}
                                    <div>
                                        <input
                                            {...register('name', { required: 'Name is required' })}
                                            placeholder="Enter your name"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:border-transparent transition"
                                        />
                                        {errors.name && <p className="text-red-500 text-sm mt-1">{String(errors.name.message)}</p>}
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <input
                                                {...register('email', {
                                                    required: 'Email is required',
                                                    pattern: {
                                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                        message: "Invalid email address"
                                                    }
                                                })}
                                                placeholder="Enter your email"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:border-transparent transition"
                                            />
                                            {errors.email && <p className="text-red-500 text-sm mt-1">{String(errors.email.message)}</p>}
                                        </div>
                                        <div>
                                            <input
                                                {...register('phone', { required: 'Phone number is required' })}
                                                placeholder="Enter your phone number"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:border-transparent transition"
                                            />
                                            {errors.phone && <p className="text-red-500 text-sm mt-1">{String(errors.phone.message)}</p>}
                                        </div>
                                    </div>

                                    {/* Type & Source */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* The backend doesn't have a specific 'Consultation Topic' field other than message or notes. 
                         We will prepend this to message or use referalSourceOther if appropriate, 
                         or just not include it in the strict API type but append to message. 
                         Let's append to message in onSubmit. */}
                                        <select
                                            {...register('topic')}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:border-transparent bg-white transition"
                                        >
                                            <option value="">Select Topic</option>
                                            <option value="Career">Career Consultation</option>
                                            <option value="Business">Business Consultation</option>
                                            <option value="Relationship">Relationship Consultation</option>
                                            <option value="Vastu">Vastu Consultation</option>
                                            <option value="Other">Other</option>
                                        </select>

                                        <select
                                            {...register('referralSource')}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:border-transparent bg-white transition"
                                        >
                                            <option value="">How did you find us?</option>
                                            <option value="GOOGLE_SEARCH">Google Search</option>
                                            <option value="FACEBOOK">Facebook</option>
                                            <option value="INSTAGRAM">Instagram</option>
                                            <option value="YOUTUBE">Youtube</option>
                                            <option value="FRIEND_REFERRAL">Friend Referral</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <textarea
                                            {...register('message', { required: 'Message is required' })}
                                            placeholder="Enter your message"
                                            rows={6}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-700)] focus:border-transparent transition resize-none"
                                        />
                                        {errors.message && <p className="text-red-500 text-sm mt-1">{String(errors.message.message)}</p>}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-2">
                                        <Button
                                            disabled={submitting}
                                            className="w-full md:w-auto px-8 py-3 bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white font-semibold rounded-md transition duration-200"
                                        >
                                            {submitting ? 'Submitting...' : 'Book Your Seat Now'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Sidebar: Recently Passout Students */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                            <div className="bg-[var(--primary-700)] px-6 py-4">
                                <h3 className="text-lg font-bold text-white">Recent Success Stories</h3>
                                <p className="text-white/80 text-sm">Graduates working professionally</p>
                            </div>

                            <div className="p-4 space-y-6">
                                {sidebarLoading ? (
                                    <p className="text-center text-gray-500 py-4">Loading success stories...</p>
                                ) : successStories.length > 0 ? (
                                    successStories.map((story) => (
                                        <div key={story.id} className="flex items-start space-x-4 pb-4 border-b last:border-0 border-gray-100">
                                            <div className="flex-shrink-0 w-16 h-16 relative rounded-full overflow-hidden border-2 border-gray-200">
                                                {story.studentImage ? (
                                                    <Image
                                                        src={story.studentImage}
                                                        alt={story.studentName}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">No Img</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900">{story.studentName}</h4>
                                                <p className="text-xs text-[var(--primary-600)] font-medium uppercase">{story.course?.title || 'Student'}</p>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{story.achievement}</p>
                                                {story.company && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {story.position ? `${story.position} at ` : ''}
                                                        <span className="font-medium">{story.company}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-4">No recent stories yet.</p>
                                )}
                            </div>

                            {/* Optional: Add a "View All" link or Banner */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                                <p className="text-sm text-gray-600">Want to be our next success story?</p>
                                <a href="/courses" className="text-[var(--primary-700)] font-semibold text-sm hover:underline">Join our courses today</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
