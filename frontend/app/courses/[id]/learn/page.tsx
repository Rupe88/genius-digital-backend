'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as lessonApi from '@/lib/api/lessons';

export default function LearnIndexPage() {
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        const fetchFirstLesson = async () => {
            try {
                const lessons = await lessonApi.getCourseLessons(params.id as string);
                if (lessons && lessons.length > 0) {
                    router.replace(`/courses/${params.id}/learn/${lessons[0].id}`);
                }
            } catch (error) {
                console.error('Error fetching lessons:', error);
            }
        };

        if (params.id) {
            fetchFirstLesson();
        }
    }, [params.id, router]);

    return (
        <div className="h-full w-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[var(--primary-700)] border-t-transparent rounded-none animate-spin"></div>
        </div>
    );
}
