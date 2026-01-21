'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { consultationApi, Consultation } from '@/lib/api/consultation';
import { Button } from '@/components/ui/Button';

export default function AdminConsultationsPage() {
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConsultations = async () => {
        setLoading(true);
        try {
            const data = await consultationApi.getAll();
            setConsultations(data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch consultations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsultations();
    }, []);

    const handleStatusChange = async (id: string, newStatus: Consultation['status']) => {
        try {
            await consultationApi.updateStatus(id, { status: newStatus });
            toast.success('Consultation status updated');
            fetchConsultations(); // Refresh list
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        }
    };

    const statusColors: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        CONFIRMED: 'bg-blue-100 text-blue-800',
        APPROVED: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-green-100 text-green-800',
        CANCELLED: 'bg-red-100 text-red-800',
        REJECTED: 'bg-red-100 text-red-800',
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading consultations...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
                <Button onClick={fetchConsultations} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                {consultations.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No consultation requests found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {consultations.map((consultation) => (
                                    <tr key={consultation.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(consultation.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{consultation.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{consultation.email}</div>
                                            <div>{consultation.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="font-medium text-gray-700">{consultation.consultationType || 'Any'}</div>
                                            <div className="text-xs text-gray-400">Ref: {consultation.referralSource || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={consultation.message}>
                                            {consultation.message}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[consultation.status] || 'bg-gray-100'}`}>
                                                {consultation.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <select
                                                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                value={consultation.status}
                                                onChange={(e) => handleStatusChange(consultation.id, e.target.value as Consultation['status'])}
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="CONFIRMED">Confirmed</option>
                                                <option value="APPROVED">Approved</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="CANCELLED">Cancelled</option>
                                                <option value="REJECTED">Rejected</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
