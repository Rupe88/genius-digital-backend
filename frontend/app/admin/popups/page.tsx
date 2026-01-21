'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { HiPlus, HiTrash, HiCheck, HiX, HiPencil } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { popupsApi, Popup } from '@/lib/api/popups';

interface PopupForm {
    title: string;
    imageUrl: string;
    linkUrl: string;
    isActive: boolean;
}

export default function AdminPopupsPage() {
    const [popups, setPopups] = useState<Popup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { register, handleSubmit, reset, setValue } = useForm<PopupForm>();

    useEffect(() => {
        fetchPopups();
    }, []);

    const fetchPopups = async () => {
        try {
            setLoading(true);
            const response = await popupsApi.getAll();
            if (response && Array.isArray(response.data)) {
                setPopups(response.data);
            } else if (response && Array.isArray(response)) {
                setPopups(response as any);
            } else {
                setPopups([]);
            }
        } catch (error) {
            toast.error('Failed to fetch popups');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: PopupForm) => {
        try {
            if (editingId) {
                await popupsApi.update(editingId, data);
                toast.success('Popup updated successfully');
            } else {
                await popupsApi.create(data);
                toast.success('Popup created successfully');
            }
            reset();
            setIsCreating(false);
            setEditingId(null);
            fetchPopups();
        } catch (error) {
            toast.error(editingId ? 'Failed to update popup' : 'Failed to create popup');
        }
    };

    const handleEdit = (popup: Popup) => {
        setEditingId(popup.id);
        setValue('title', popup.title);
        setValue('imageUrl', popup.imageUrl);
        setValue('linkUrl', popup.linkUrl || '');
        setValue('isActive', popup.isActive);
        setIsCreating(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this popup?')) return;
        try {
            await popupsApi.delete(id);
            toast.success('Popup deleted');
            fetchPopups();
        } catch (error) {
            toast.error('Failed to delete popup');
        }
    };

    const handleToggleStatus = async (popup: Popup) => {
        try {
            await popupsApi.update(popup.id, { isActive: !popup.isActive });
            toast.success(`Popup ${!popup.isActive ? 'activated' : 'deactivated'}`);
            fetchPopups();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Promotional Popups</h1>
                    <p className="text-gray-600">Manage site-wide promotional popups</p>
                </div>
                <Button onClick={() => { setIsCreating(true); setEditingId(null); reset(); }}>
                    <HiPlus className="w-5 h-5 mr-2" />
                    Add New Popup
                </Button>
            </div>

            {isCreating && (
                <Card className="mb-6 p-6">
                    <div className="flex justify-between mb-4">
                        <h3 className="text-lg font-semibold">{editingId ? 'Edit Popup' : 'Create New Popup'}</h3>
                        <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                            <HiX className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Title" {...register('title', { required: true })} placeholder="e.g. Special Offer" />
                            <Input label="Image URL" {...register('imageUrl', { required: true })} placeholder="https://..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Link URL (Optional)" {...register('linkUrl')} placeholder="https://..." />
                            <div className="flex items-center space-x-2 mt-8">
                                <input type="checkbox" id="isActive" {...register('isActive')} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible to users)</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-900">Image</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Title</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Link</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : popups.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No popups found.</td></tr>
                            ) : (
                                popups.map((popup) => (
                                    <tr key={popup.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="relative h-16 w-16 rounded overflow-hidden bg-gray-100">
                                                <Image src={popup.imageUrl} alt={popup.title} fill className="object-cover" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{popup.title}</td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{popup.linkUrl || '-'}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(popup)}
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${popup.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {popup.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(popup)} className="text-indigo-600 hover:text-indigo-900 p-1">
                                                <HiPencil className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(popup.id)} className="text-red-600 hover:text-red-900 p-1">
                                                <HiTrash className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
