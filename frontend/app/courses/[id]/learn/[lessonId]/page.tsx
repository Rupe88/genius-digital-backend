'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as lessonApi from '@/lib/api/lessons';
import * as progressApi from '@/lib/api/progress';
import * as quizApi from '@/lib/api/quizzes';
import { Lesson } from '@/lib/types/course';
import { LessonPlayer } from '@/components/player/LessonPlayer';
import { Button } from '@/components/ui/Button';
import { HiCheckCircle } from 'react-icons/hi';
import { showSuccess } from '@/lib/utils/toast';

export default function LessonPage() {
    const params = useParams();
    const router = useRouter();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (params.lessonId) {
            fetchLesson(params.lessonId as string);
        }
    }, [params.lessonId]);

    const fetchLesson = async (id: string) => {
        try {
            setLoading(true);
            const data = await lessonApi.getLessonById(id);

            // If it's a quiz and quiz data is missing, fetch it
            if (data.lessonType === 'QUIZ' && !data.quiz) {
                try {
                    const quizData = await quizApi.getQuizByLesson(data.id);
                    data.quiz = quizData;
                } catch (err) {
                    console.error('Error fetching quiz data:', err);
                }
            }

            setLesson(data);
        } catch (error) {
            console.error('Error fetching lesson:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!lesson) return;
        try {
            setCompleting(true);
            await progressApi.completeLesson(lesson.id);
            showSuccess('Lesson completed!');
        } catch (error) {
            console.error('Error completing lesson:', error);
        } finally {
            setCompleting(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-none animate-spin"></div>
            <p className="text-gray-500 font-bold">Synchronizing lesson...</p>
        </div>
    );

    if (!lesson) return <div className="text-center py-20 font-bold text-gray-500">Lesson not found</div>;

    return (
        <div className="animate-fadeIn">
            <LessonPlayer lesson={lesson} onComplete={handleComplete} />

            <div className="mt-12 pt-8 border-t border-gray-200 flex justify-end">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleComplete}
                    isLoading={completing}
                    className="rounded-none px-12 h-14 font-black shadow-xl shadow-blue-700/20 active:scale-95 transition-transform"
                >
                    Mark as Completed <HiCheckCircle className="ml-2 w-5 h-5" />
                </Button>
            </div>

            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
