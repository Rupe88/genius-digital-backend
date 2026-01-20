'use client';

import React from 'react';
import { Lesson } from '@/lib/types/course';
import { QuizPlayer } from './QuizPlayer';
import { HiDocumentText, HiVideoCamera, HiClipboardList, HiDownload } from 'react-icons/hi';
import { getYouTubeEmbedUrl } from '@/lib/utils/helpers';

interface LessonPlayerProps {
    lesson: Lesson;
    onComplete?: () => void;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({ lesson, onComplete }) => {
    const renderContent = () => {
        switch (lesson.lessonType) {
            case 'VIDEO':
                const youtubeUrl = lesson.videoUrl ? getYouTubeEmbedUrl(lesson.videoUrl) : null;
                return (
                    <div className="space-y-6">
                        <div className="aspect-video bg-black shadow-2xl">
                            {youtubeUrl ? (
                                <iframe
                                    src={youtubeUrl}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : lesson.videoUrl ? (
                                <video
                                    src={lesson.videoUrl}
                                    controls
                                    className="w-full h-full"
                                    onEnded={onComplete}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                    <HiVideoCamera className="w-16 h-16 opacity-20" />
                                    <p className="font-bold">Video content not available</p>
                                </div>
                            )}
                        </div>
                        <div className="prose max-w-none text-gray-700 ql-editor px-0"
                            dangerouslySetInnerHTML={{ __html: lesson.content || lesson.description || '' }} />
                    </div>
                );

            case 'TEXT':
                return (
                    <div className="bg-white p-8 md:p-12 shadow-sm border border-gray-100 min-h-[500px]">
                        <div className="prose max-w-none text-gray-800 leading-relaxed ql-editor px-0"
                            dangerouslySetInnerHTML={{ __html: lesson.content || lesson.description || '' }} />
                    </div>
                );

            case 'PDF':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-6">
                            <div className="w-24 h-24 bg-red-50 text-red-500 flex items-center justify-center">
                                <HiDocumentText className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">PDF Document</h3>
                                <p className="text-gray-500 font-medium">Download or view the course materials below</p>
                            </div>
                            {lesson.attachmentUrl && (
                                <a
                                    href={lesson.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black shadow-lg transition-all"
                                >
                                    <HiDownload className="w-5 h-5" />
                                    Download PDF
                                </a>
                            )}
                        </div>
                        <div className="prose max-w-none text-gray-700 ql-editor px-0"
                            dangerouslySetInnerHTML={{ __html: lesson.content || lesson.description || '' }} />
                    </div>
                );

            case 'QUIZ':
                return lesson.quiz ? (
                    <QuizPlayer quiz={lesson.quiz} onComplete={(result) => {
                        if (result.passed && onComplete) onComplete();
                    }} />
                ) : (
                    <div className="text-center p-20 bg-gray-50 border-2 border-dashed border-gray-200">
                        <HiClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-bold">No quiz data found for this lesson.</p>
                    </div>
                );

            case 'ASSIGNMENT':
                return (
                    <div className="bg-white p-8 md:p-12 shadow-sm border border-gray-100 space-y-8">
                        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                            <div className="w-12 h-12 bg-purple-50 text-purple-500 flex items-center justify-center">
                                <HiClipboardList className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Assignment Details</h3>
                        </div>
                        <div className="prose max-w-none text-gray-800 leading-relaxed ql-editor px-0"
                            dangerouslySetInnerHTML={{ __html: lesson.content || lesson.description || '' }} />
                        {lesson.attachmentUrl && (
                            <div className="pt-6 border-t border-gray-50">
                                <a
                                    href={lesson.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[var(--primary-700)] font-black hover:underline"
                                >
                                    <HiDownload className="w-5 h-5" />
                                    Attachment.zip
                                </a>
                            </div>
                        )}
                    </div>
                );

            default:
                return <div>Unsupported lesson type</div>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{lesson.title}</h2>
                {lesson.lessonType === 'VIDEO' && lesson.videoDuration && (
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        Duration: {Math.floor(lesson.videoDuration / 60)} minutes
                    </p>
                )}
            </div>
            {renderContent()}
        </div>
    );
};
