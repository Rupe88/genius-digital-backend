'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import * as courseApi from '@/lib/api/courses';
import * as chapterApi from '@/lib/api/chapters';
import * as lessonApi from '@/lib/api/lessons';
import { Course, Chapter, Lesson } from '@/lib/types/course';
import { HiMenu, HiX, HiChevronDown, HiChevronUp, HiPlay, HiDocument, HiClipboardCheck, HiChevronLeft } from 'react-icons/hi';
import { useAuth } from '@/lib/context/AuthContext';
import { showError } from '@/lib/utils/toast';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push(`/login?redirect=${pathname}`);
        }
    }, [isAuthenticated, authLoading, pathname, router]);

    useEffect(() => {
        if (params.id) {
            fetchCourseData(params.id as string);
        }
    }, [params.id]);

    const fetchCourseData = async (courseId: string) => {
        try {
            setLoading(true);
            const [courseData, chaptersData, lessonsData] = await Promise.all([
                courseApi.getCourseById(courseId),
                chapterApi.getCourseChapters(courseId),
                lessonApi.getCourseLessons(courseId)
            ]);

            setCourse(courseData);
            setChapters(chaptersData);
            setLessons(lessonsData);

            // Auto-expand chapter containing current lesson
            const lessonId = params.lessonId as string;
            if (lessonId) {
                const lesson = lessonsData.find(l => l.id === lessonId);
                if (lesson?.chapterId) {
                    setExpandedChapters(new Set([lesson.chapterId]));
                }
            } else if (chaptersData.length > 0) {
                setExpandedChapters(new Set([chaptersData[0].id]));
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
            showError('Failed to load course details');
        } finally {
            setLoading(false);
        }
    };

    const toggleChapter = (chapterId: string) => {
        const newExpanded = new Set(expandedChapters);
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId);
        } else {
            newExpanded.add(chapterId);
        }
        setExpandedChapters(newExpanded);
    };

    const getLessonIcon = (type: string) => {
        switch (type) {
            case 'VIDEO': return <HiPlay className="w-4 h-4" />;
            case 'PDF': return <HiDocument className="w-4 h-4" />;
            case 'QUIZ':
            case 'ASSIGNMENT': return <HiClipboardCheck className="w-4 h-4" />;
            default: return <HiDocument className="w-4 h-4" />;
        }
    };

    if (loading || authLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
                <div className="w-16 h-16 border-4 border-[var(--primary-700)] border-t-transparent rounded-none animate-spin mb-4"></div>
                <p className="text-gray-900 font-black text-xl">Entering classroom...</p>
            </div>
        );
    }

    if (!course) return null;

    const currentLessonId = params.lessonId as string;

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
            {/* Dynamic Header */}
            <header className="h-16 bg-gray-900 text-white flex items-center justify-between px-6 z-30 shadow-2xl">
                <div className="flex items-center gap-4">
                    <Link href={`/courses/${course.id}`} className="p-2 hover:bg-white/10 rounded-none transition-colors">
                        <HiChevronLeft className="w-6 h-6" />
                    </Link>
                    <div className="h-8 w-[1px] bg-white/20 mx-2 hidden md:block"></div>
                    <h1 className="text-lg font-black truncate max-w-[200px] md:max-w-md">
                        {course.title}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex flex-col items-end mr-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Your Progress</span>
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-white/10 rounded-none overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${course.enrollment?.progress || 0}%` }}></div>
                            </div>
                            <span className="text-sm font-black">{course.enrollment?.progress || 0}%</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 hover:bg-white/10 rounded-none transition-colors"
                    >
                        {sidebarOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Course Sidebar */}
                <aside className={`
          absolute lg:relative inset-y-0 right-0 w-80 lg:w-96 bg-white border-l border-gray-200 z-20 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        `}>
                    <div className="h-full flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-black text-gray-900">Course Content</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="divide-y divide-gray-50">
                                {chapters.map((chapter, idx) => {
                                    const chapterLessons = lessons.filter(l => l.chapterId === chapter.id);
                                    const isExpanded = expandedChapters.has(chapter.id);

                                    return (
                                        <div key={chapter.id} className="bg-white">
                                            <button
                                                onClick={() => toggleChapter(chapter.id)}
                                                className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-black text-gray-400">0{idx + 1}</span>
                                                    <h3 className="font-bold text-gray-900 group-hover:text-[var(--primary-700)] transition-colors">{chapter.title}</h3>
                                                </div>
                                                {isExpanded ? <HiChevronUp /> : <HiChevronDown />}
                                            </button>

                                            {isExpanded && (
                                                <div className="bg-white">
                                                    {chapterLessons.map((lesson) => (
                                                        <Link
                                                            key={lesson.id}
                                                            href={`/courses/${course.id}/learn/${lesson.id}`}
                                                            className={`
                                flex items-center gap-4 px-8 py-4 text-sm font-bold transition-all border-l-4
                                ${currentLessonId === lesson.id
                                                                    ? 'bg-blue-50 text-[var(--primary-700)] border-[var(--primary-700)]'
                                                                    : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'}
                              `}
                                                        >
                                                            <div className={`p-1.5 rounded-none ${currentLessonId === lesson.id ? 'bg-[var(--primary-700)] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                                {getLessonIcon(lesson.lessonType)}
                                                            </div>
                                                            <span className="flex-1">{lesson.title}</span>
                                                            {lesson.videoDuration && (
                                                                <span className="text-[10px] text-gray-400">{Math.floor(lesson.videoDuration / 60)}m</span>
                                                            )}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-gray-50 lg:p-10 p-4 no-scrollbar">
                    <div className="max-w-5xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>

            <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
