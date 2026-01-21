'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiPlus, HiPencil, HiTrash, HiSearch, HiExternalLink } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { blogsApi, Blog } from '@/lib/api/blog';
import { ROUTES } from '@/lib/utils/constants';

export default function AdminBlogsPage() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const response = await blogsApi.getAll({ search });
            if (response && response.data) {
                setBlogs(response.data);
            } else {
                setBlogs([]);
            }
        } catch (error) {
            toast.error('Failed to fetch blogs');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this blog?')) return;
        try {
            await blogsApi.delete(id);
            toast.success('Blog deleted successfully');
            fetchBlogs();
        } catch (error) {
            toast.error('Failed to delete blog');
        }
    };

    // Simple Debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBlogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
                    <p className="text-gray-600">Create, edit, and manage blog posts</p>
                </div>
                <Link href={`${ROUTES.ADMIN}/blogs/new`}>
                    <Button>
                        <HiPlus className="w-5 h-5 mr-2" />
                        Create New Blog
                    </Button>
                </Link>
            </div>

            <Card className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                    <HiSearch className="text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="Search blogs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-900">Image</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Title</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Views</th>
                                <th className="px-6 py-3 font-semibold text-gray-900">Date</th>
                                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : blogs.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No blogs found.</td></tr>
                            ) : (
                                blogs.map((blog) => (
                                    <tr key={blog.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="relative h-12 w-20 rounded overflow-hidden bg-gray-100">
                                                {blog.featuredImage ? (
                                                    <Image src={blog.featuredImage} alt={blog.title} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Img</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="truncate max-w-xs" title={blog.title}>{blog.title}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs">/{blog.slug}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${blog.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                                                    blog.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {blog.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{blog.views}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(blog.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Link href={`/blog/${blog.slug}`} target="_blank" className="text-gray-500 hover:text-gray-700 inline-block p-1">
                                                <HiExternalLink className="w-5 h-5" />
                                            </Link>
                                            <Link href={`${ROUTES.ADMIN}/blogs/${blog.id}/edit`} className="text-indigo-600 hover:text-indigo-900 inline-block p-1">
                                                <HiPencil className="w-5 h-5" />
                                            </Link>
                                            <button onClick={() => handleDelete(blog.id)} className="text-red-600 hover:text-red-900 inline-block p-1">
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
