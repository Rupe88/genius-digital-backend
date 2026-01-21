'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { HiArrowLeft, HiUpload, HiCheck } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { blogsApi } from '@/lib/api/blog';
import { ROUTES } from '@/lib/utils/constants';

interface BlogForm {
    title: string;
    slug: string;
    excerpt: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    featured: boolean;
    seoTitle: string;
    seoDescription: string;
}

export default function CreateBlogPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BlogForm>({
        defaultValues: {
            status: 'PUBLISHED', // Default to Published as per screenshot preference often
            featured: false
        }
    });

    const title = watch('title');

    // Auto-generate slug from title
    useEffect(() => {
        if (title) {
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            setValue('slug', slug);
        }
    }, [title, setValue]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (data: BlogForm) => {
        if (!content) {
            toast.error('Content is required');
            return;
        }

        try {
            setLoading(true);
            console.log('Submitting blog...', data);

            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('slug', data.slug);
            formData.append('content', content);
            formData.append('status', data.status);
            formData.append('featured', String(data.featured));

            if (data.excerpt) formData.append('excerpt', data.excerpt);
            if (data.seoTitle) formData.append('seoTitle', data.seoTitle);
            if (data.seoDescription) formData.append('seoDescription', data.seoDescription);

            if (selectedFile) {
                formData.append('featuredImage', selectedFile);
            }

            await blogsApi.create(formData);

            toast.success('Blog created successfully');
            router.push(`${ROUTES.ADMIN}/blogs`);
        } catch (error: any) {
            console.error('Blog creation error:', error);
            toast.error(error.message || 'Failed to create blog');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex items-center space-x-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                    <HiArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Create New Blog</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 space-y-6 shadow-sm border border-gray-100">
                        <div className="grid grid-cols-1 gap-6">
                            <Input
                                label="Title"
                                {...register('title', { required: 'Title is required' })}
                                error={errors.title?.message}
                                placeholder="Enter blog title"
                            />
                            <Input
                                label="Slug"
                                {...register('slug', { required: 'Slug is required' })}
                                error={errors.slug?.message}
                                helperText="URL-friendly version of the title"
                                placeholder="url-slug"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                            <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white min-h-[400px]">
                                <RichTextEditor
                                    value={content}
                                    onChange={setContent}
                                    placeholder="Start writing your amazing article..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                            <textarea
                                {...register('excerpt')}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 h-24 resize-none"
                                placeholder="Short summary for list view and SEO..."
                            />
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">SEO Settings</h3>
                        <div className="space-y-4 pt-2">
                            <Input label="SEO Title" {...register('seoTitle')} placeholder="Meta Title" />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                                <textarea
                                    {...register('seoDescription')}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 h-20"
                                    placeholder="Meta Description"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 space-y-6 shadow-sm border border-gray-100 sticky top-6">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Publishing</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                {...register('status')}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5"
                            >
                                <option value="DRAFT">Draft</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                            <input
                                type="checkbox"
                                id="featured"
                                {...register('featured')}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <label htmlFor="featured" className="text-sm font-medium text-gray-700 cursor-pointer">Featured Post</label>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full py-2.5 text-base" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Blog Post'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Featured Image</h3>
                        <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all ${selectedFile || previewUrl ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'}`}>

                            {previewUrl ? (
                                <div className="w-full mb-4">
                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-sm">
                                        <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                                    </div>
                                    <p className="mt-2 text-xs text-center text-gray-500 truncate w-full">{selectedFile?.name || 'Current Image'}</p>
                                </div>
                            ) : (
                                <div className="text-center mb-6 mt-2">
                                    <div className="mx-auto h-12 w-12 text-indigo-400 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                                        <HiUpload className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">Click to upload</p>
                                    <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 10MB)</p>
                                </div>
                            )}

                            <label className="cursor-pointer">
                                <span className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                                    {previewUrl ? 'Replace Image' : 'Select Image'}
                                </span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    </Card>
                </div>
            </form>
        </div>
    );
}
