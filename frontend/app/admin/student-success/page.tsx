'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { studentSuccessApi, StudentSuccess, CreateStudentSuccessRequest } from '@/lib/api/studentSuccess';
import { Button } from '@/components/ui/Button';
import { HiPlus, HiPencil, HiTrash, HiCheck, HiX } from 'react-icons/hi';
import Image from 'next/image';

export default function AdminStudentSuccessPage() {
    const [stories, setStories] = useState<StudentSuccess[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateStudentSuccessRequest>();

    const fetchStories = async () => {
        setLoading(true);
        try {
            const response = await studentSuccessApi.getAll();
            setStories(response.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch success stories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const onSubmit = async (data: CreateStudentSuccessRequest) => {
        try {
            if (editId) {
                await studentSuccessApi.update(editId, data);
                toast.success('Success story updated');
            } else {
                await studentSuccessApi.create(data);
                toast.success('Success story created');
            }
            reset();
            setIsEditing(false);
            setEditId(null);
            fetchStories();
        } catch (error) {
            console.error(error);
            toast.error(editId ? 'Failed to update story' : 'Failed to create story');
        }
    };

    const handleEdit = (story: StudentSuccess) => {
        setEditId(story.id);
        setIsEditing(true);
        setValue('studentName', story.studentName);
        setValue('courseId', story.courseId);
        setValue('achievement', story.achievement);
        setValue('title', story.title);
        setValue('story', story.story);
        setValue('studentImage', story.studentImage);
        setValue('featured', story.featured);
        setValue('isPublished', story.isPublished);

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this story?')) return;
        try {
            await studentSuccessApi.delete(id);
            toast.success('Story deleted');
            fetchStories();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete story');
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        reset();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Student Success Stories</h1>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} className="flex items-center space-x-2">
                        <HiPlus className="w-5 h-5" />
                        <span>Add New Story</span>
                    </Button>
                )}
            </div>

            {/* Form Section */}
            {isEditing && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 animate-fade-in">
                    <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Success Story' : 'Add New Success Story'}</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Student Name</label>
                                <input
                                    {...register('studentName', { required: 'Required' })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                                {errors.studentName && <span className="text-red-500 text-xs">Required</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Course ID</label>
                                <input
                                    {...register('courseId')}
                                    placeholder="Optional Course ID"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Achievement (Short)</label>
                                <input
                                    {...register('achievement', { required: 'Required' })}
                                    placeholder="e.g. Landed a job at Google"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                                <input
                                    {...register('studentImage')}
                                    placeholder="https://..."
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Job Title / Headline</label>
                            <input
                                {...register('title')}
                                placeholder="e.g. Senior Architect"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Story</label>
                            <textarea
                                {...register('story')}
                                rows={4}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>

                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" {...register('isPublished')} className="rounded text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Published</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" {...register('featured')} className="rounded text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Featured</span>
                            </label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
                            <Button type="submit">{editId ? 'Update Story' : 'Create Story'}</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Section */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading stories...</div>
                ) : stories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No success stories found. Add one above!</div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {stories.map((story) => (
                            <li key={story.id} className="p-4 hover:bg-gray-50 transition">
                                <div className="flex items-center justify-between">
                                    {/* Left Side: Image & Info */}
                                    <div className="flex items-center space-x-4">
                                        <div className="relative h-16 w-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                                            {story.studentImage ? (
                                                <Image src={story.studentImage} alt={story.studentName} fill className="object-cover" />
                                            ) : (
                                                <span className="flex items-center justify-center h-full text-xs text-gray-400">No Img</span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">{story.studentName}</h3>
                                            <p className="text-sm text-gray-500">{story.course?.title || 'Unknown Course'} • {story.achievement}</p>
                                            <div className="flex space-x-2 mt-1">
                                                {story.isPublished ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Published</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Draft</span>
                                                )}
                                                {story.featured && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Featured</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Actions */}
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(story)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition"
                                            title="Edit"
                                        >
                                            <HiPencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(story.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                                            title="Delete"
                                        >
                                            <HiTrash className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
