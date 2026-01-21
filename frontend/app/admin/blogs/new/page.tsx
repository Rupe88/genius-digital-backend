'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { HiArrowLeft, HiUpload } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import RichTextEditor from '@/components/ui/RichTextEditor'; // Assuming I created this component
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
            status: 'DRAFT',
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
        } catch (error) {
            console.error(error);
            toast.error('Failed to create blog');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <HiArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Create New Blog</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 space-y-4">
                        <Input
                            label="Title"
                            {...register('title', { required: 'Title is required' })}
                            error={errors.title?.message}
                        />
                        <Input
                            label="Slug"
                            {...register('slug', { required: 'Slug is required' })}
                            error={errors.slug?.message}
                            helperText="URL-friendly version of the title"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                            <RichTextEditor value={content} onChange={setContent} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                            <textarea
                                {...register('excerpt')}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                rows={3}
                            />
                            <p className="text-xs text-gray-500 mt-1">Short summary for list view.</p>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h3 className="text-lg font-medium">SEO Settings</h3>
                        <Input label="SEO Title" {...register('seoTitle')} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                            <textarea
                                {...register('seoDescription')}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                rows={2}
                            />
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <h3 className="text-lg font-medium">Publishing</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                {...register('status')}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                                <option value="DRAFT">Draft</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="featured"
                                {...register('featured')}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="featured" className="text-sm font-medium text-gray-700">Featured Post</label>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Blog'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h3 className="text-lg font-medium">Featured Image</h3>
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                            {previewUrl ? (
                                <div className="relative w-full h-48 mb-4">
                                    <Image src={previewUrl} alt="Preview" fill className="object-cover rounded-md" />
                                </div>
                            ) : (
                                <div className="text-center mb-4">
                                    <div className="mx-auto h-12 w-12 text-gray-400">
                                        <HiUpload className="w-full h-full" />
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">Upload an image</p>
                                </div>
                            )}
                            <label className="cursor-pointer">
                                <span className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Select Image
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
