'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { HiArrowLeft, HiCalendar, HiUser } from 'react-icons/hi';
import { blogsApi, Blog } from '@/lib/api/blog';

export default function BlogDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    const [blog, setBlog] = useState<Blog | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) {
            const fetchBlog = async () => {
                try {
                    // Assuming getById also accepts slug, or we need a getBySlug method.
                    // The backend getBlogById (controller) handles ID OR Slug.
                    const response = await blogsApi.getById(slug);
                    if (response && response.data) {
                        setBlog(response.data);
                    } else {
                        // Handle 404
                        setBlog(null);
                    }
                } catch (error) {
                    console.error('Failed to fetch blog', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchBlog();
        }
    }, [slug]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading article...</div>;
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold text-gray-900">Article not found</h1>
                <button onClick={() => router.back()} className="text-indigo-600 hover:text-indigo-800">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <article className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="relative w-full h-[400px] md:h-[500px]">
                {blog.featuredImage ? (
                    <Image
                        src={blog.featuredImage}
                        alt={blog.title}
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-6xl">📚</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12">
                    <div className="max-w-4xl mx-auto w-full">
                        <button
                            onClick={() => router.push('/blog')}
                            className="text-white/80 hover:text-white mb-6 flex items-center text-sm font-medium transition-colors"
                        >
                            <HiArrowLeft className="mr-2" />
                            Back to Blog
                        </button>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                            {blog.title}
                        </h1>
                        <div className="flex items-center text-white/90 text-sm sm:text-base space-x-6">
                            <span className="flex items-center">
                                <HiCalendar className="mr-2" />
                                {new Date(blog.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            {blog.author && (
                                <span className="flex items-center">
                                    <HiUser className="mr-2" />
                                    {blog.author.fullName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div
                    className="blog-content text-gray-800 leading-relaxed text-lg"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {blog.tags && (
                    <div className="mt-12 pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-500 mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {blog.tags.split(',').map(tag => (
                                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                                    #{tag.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
        .blog-content h1 { font-size: 2.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #111827; }
        .blog-content h2 { font-size: 1.875rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; color: #1f2937; }
        .blog-content h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1f2937; }
        .blog-content p { margin-bottom: 1.5rem; }
        .blog-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .blog-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .blog-content blockquote { border-left: 4px solid #4f46e5; padding-left: 1rem; font-style: italic; color: #4b5563; margin-bottom: 1.5rem; background: #f9fafb; padding: 1rem; border-radius: 0 0.5rem 0.5rem 0; }
        .blog-content img { border-radius: 0.75rem; margin-top: 2rem; margin-bottom: 2rem; width: 100%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .blog-content a { color: #4f46e5; text-decoration: underline; }
      `}</style>
        </article>
    );
}
