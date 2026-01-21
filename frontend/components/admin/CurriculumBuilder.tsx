'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { classNames } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Lesson, CreateLessonData, QuizData, QuizQuestionData } from '@/lib/api/lessons';
import { Chapter, CreateChapterData } from '@/lib/api/chapters';

// Local curriculum types for when course doesn't exist yet
interface LocalChapter {
  id: string;
  title: string;
  description: string;
  isLocked: boolean;
  isPreview: boolean;
  order: number;
  lessons: LocalLesson[];
}

interface LocalLesson {
  id: string;
  title: string;
  description: string;
  content?: string;
  lessonType: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  videoUrl?: string;
  videoDuration?: number;
  isPreview: boolean;
  isLocked: boolean;
  quiz?: QuizData;
}
import { FileUpload } from '@/components/ui/FileUpload';
import * as lessonApi from '@/lib/api/lessons';
import * as chapterApi from '@/lib/api/chapters';
import { showSuccess, showError } from '@/lib/utils/toast';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiLockClosed,
  HiLockOpen,
  HiEye,
  HiEyeSlash,
  HiPlay,
  HiDocument,
  HiClipboard,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi2';
import { HiX } from 'react-icons/hi';

interface CurriculumBuilderProps {
  courseId?: string;
  initialChapters?: Chapter[];
  onChaptersChange?: (chapters: any[]) => void;
  onLessonsChange?: (lessons: any[]) => void;
}

interface ChapterFormData {
  title: string;
  description: string;
  isLocked: boolean;
  isPreview: boolean;
}

interface LessonFormData {
  title: string;
  description: string;
  content: string;
  lessonType: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  videoUrl: string;
  videoDuration: number;
  isPreview: boolean;
  isLocked: boolean;
  videoFile: File | null;
  attachmentFile: File | null;
  quizData: QuizData;
}

export const CurriculumBuilder: React.FC<CurriculumBuilderProps> = ({
  courseId,
  initialChapters = [],
  onChaptersChange,
  onLessonsChange,
}) => {
  const [chapters, setChapters] = useState<(Chapter | LocalChapter)[]>(initialChapters || []);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | LocalChapter | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | LocalLesson | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Form states
  const [chapterForm, setChapterForm] = useState<ChapterFormData>({
    title: '',
    description: '',
    isLocked: false,
    isPreview: false,
  });

  const [lessonForm, setLessonForm] = useState<LessonFormData>({
    title: '',
    description: '',
    content: '',
    lessonType: 'VIDEO',
    videoUrl: '',
    videoDuration: 0,
    isPreview: false,
    isLocked: false,
    videoFile: null,
    attachmentFile: null,
    quizData: {
      title: '',
      questions: [{ question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }],
    },
  });

  // Load chapters on mount
  useEffect(() => {
    if (courseId) {
      loadChapters();
    }
  }, [courseId]);

  const loadChapters = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      const chapters = await chapterApi.getCourseChapters(courseId);
      setChapters(chapters || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
      showError('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  // Chapter operations
  const handleCreateChapter = () => {
    setEditingChapter(null);
    setChapterForm({
      title: '',
      description: '',
      isLocked: false,
      isPreview: false,
    });
    setShowChapterModal(true);
  };

  const handleEditChapter = (chapter: Chapter | LocalChapter) => {
    setEditingChapter(chapter);
    setChapterForm({
      title: chapter.title,
      description: chapter.description || '',
      isLocked: chapter.isLocked || false,
      isPreview: chapter.isPreview || false,
    });
    setShowChapterModal(true);
  };

  const handleSaveChapter = async () => {
    try {
      if (!chapterForm.title.trim()) {
        showError('Chapter title is required');
        return;
      }

      if (courseId) {
        // Save to API if course exists
        const chapterData: CreateChapterData = {
          courseId,
          title: chapterForm.title.trim(),
          description: chapterForm.description.trim() || undefined,
          isLocked: chapterForm.isLocked,
          isPreview: chapterForm.isPreview,
        };

        if (editingChapter) {
          await chapterApi.updateChapter(editingChapter.id, chapterData);
          showSuccess('Chapter updated successfully');
        } else {
          await chapterApi.createChapter(chapterData);
          showSuccess('Chapter created successfully');
        }

        setShowChapterModal(false);
        loadChapters();
      } else {
        // Work with local state if no courseId
        const newChapter: LocalChapter = {
          id: editingChapter?.id || `temp-${Date.now()}`,
          title: chapterForm.title.trim(),
          description: chapterForm.description.trim() || '',
          isLocked: chapterForm.isLocked,
          isPreview: chapterForm.isPreview,
          order: editingChapter ? (editingChapter as LocalChapter).order : chapters.length,
          lessons: (editingChapter as LocalChapter)?.lessons || [],
        };

        let updatedChapters: (Chapter | LocalChapter)[];
        if (editingChapter) {
          updatedChapters = chapters.map(ch => ch.id === editingChapter.id ? newChapter : ch);
        } else {
          updatedChapters = [...chapters, newChapter];
        }

        setChapters(updatedChapters);
        onChaptersChange?.(updatedChapters);
        setShowChapterModal(false);
        showSuccess(editingChapter ? 'Chapter updated successfully' : 'Chapter added locally');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      showError('Failed to save chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter? This will also delete all lessons in this chapter.')) {
      return;
    }

    if (courseId) {
      try {
        await chapterApi.deleteChapter(chapterId);
        showSuccess('Chapter deleted successfully');
        loadChapters();
      } catch (error) {
        console.error('Error deleting chapter:', error);
        showError('Failed to delete chapter');
      }
    } else {
      const updatedChapters = chapters.filter(ch => ch.id !== chapterId);
      setChapters(updatedChapters);
      onChaptersChange?.(updatedChapters);
      showSuccess('Chapter removed locally');
    }
  };

  // Lesson operations
  const handleCreateLesson = (chapterId: string) => {
    setEditingLesson(null);
    setSelectedChapterId(chapterId);
    setLessonForm({
      title: '',
      description: '',
      content: '',
      lessonType: 'VIDEO',
      videoUrl: '',
      videoDuration: 0,
      isPreview: false,
      isLocked: false,
      videoFile: null,
      attachmentFile: null,
      quizData: {
        title: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }],
      },
    });
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson: Lesson | LocalLesson) => {
    setEditingLesson(lesson);
    setSelectedChapterId((lesson as Lesson).chapterId || '');

    // Default quiz data if not present
    let quizData: QuizData;

    // Check if it's a server Lesson (has .quiz) or LocalLesson (has .quiz object directly or inside quizData sometimes)
    if ('quiz' in lesson && lesson.quiz) {
      // It's a server Lesson or LocalLesson with quiz property
      const q = lesson.quiz as any; // Using any temporarily to bridge types, but logic is safe
      quizData = {
        title: q.title || '',
        description: q.description || '',
        timeLimit: q.timeLimit || 0,
        passingScore: q.passingScore || 70,
        questions: q.questions?.map((q: any) => ({
          question: q.question,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : ['', '', '', '']),
          correctAnswer: q.correctAnswer || '',
          points: q.points || 1,
        })) || [{ question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }],
      };
    } else {
      quizData = {
        title: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }],
      };
    }

    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      content: lesson.content || '',
      lessonType: lesson.lessonType as 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT',
      videoUrl: lesson.videoUrl || '',
      videoDuration: lesson.videoDuration || 0,
      isPreview: lesson.isPreview || false,
      isLocked: lesson.isLocked || false,
      videoFile: null,
      attachmentFile: null,
      quizData,
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    try {
      if (!lessonForm.title.trim()) {
        showError('Lesson title is required');
        return;
      }

      if (courseId) {
        // Save to API if course exists
        const lessonData: CreateLessonData = {
          courseId,
          chapterId: selectedChapterId || undefined,
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim() || undefined,
          content: lessonForm.content.trim() || undefined,
          lessonType: lessonForm.lessonType,
          videoUrl: lessonForm.videoUrl || undefined,
          videoDuration: lessonForm.videoDuration || undefined,
          isPreview: lessonForm.isPreview,
          isLocked: lessonForm.isLocked,
          videoFile: lessonForm.videoFile || undefined,
          attachmentFile: lessonForm.attachmentFile || undefined,
          quizData: lessonForm.lessonType === 'QUIZ' ? lessonForm.quizData : undefined,
        };

        if (editingLesson) {
          await lessonApi.updateLesson(editingLesson.id, lessonData);
          showSuccess('Lesson updated successfully');
        } else {
          await lessonApi.createLesson(lessonData);
          showSuccess('Lesson created successfully');
        }

        setShowLessonModal(false);
        loadChapters();
      } else {
        // Work with local state if no courseId
        const newLesson: LocalLesson = {
          id: editingLesson?.id || `temp-lesson-${Date.now()}`,
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim() || '',
          content: lessonForm.content.trim() || '',
          lessonType: lessonForm.lessonType,
          videoUrl: lessonForm.videoUrl || undefined,
          videoDuration: lessonForm.videoDuration || undefined,
          isPreview: lessonForm.isPreview,
          isLocked: lessonForm.isLocked,
          quiz: lessonForm.lessonType === 'QUIZ' ? lessonForm.quizData : undefined,
        };

        // Add lesson to the selected chapter
        const updatedChapters = (chapters as LocalChapter[]).map(chapter => {
          if (chapter.id === selectedChapterId) {
            const lessons = chapter.lessons || [];
            let updatedLessons: LocalLesson[];
            if (editingLesson) {
              updatedLessons = lessons.map(l => l.id === editingLesson.id ? newLesson : l);
            } else {
              updatedLessons = [...lessons, newLesson];
            }
            return {
              ...chapter,
              lessons: updatedLessons
            } as LocalChapter;
          }
          return chapter;
        });

        setChapters(updatedChapters);
        onChaptersChange?.(updatedChapters);
        setShowLessonModal(false);
        showSuccess(editingLesson ? 'Lesson updated successfully' : 'Lesson added locally');
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      showError('Failed to save lesson');
    }
  };

  const addQuizQuestion = () => {
    setLessonForm(prev => ({
      ...prev,
      quizData: {
        ...prev.quizData,
        questions: [
          ...prev.quizData.questions,
          { question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 },
        ],
      },
    }));
  };

  const removeQuizQuestion = (index: number) => {
    setLessonForm(prev => ({
      ...prev,
      quizData: {
        ...prev.quizData,
        questions: prev.quizData.questions.filter((_, i) => i !== index),
      },
    }));
  };

  const updateQuizQuestion = (index: number, field: string, value: any) => {
    setLessonForm(prev => {
      const newQuestions = [...prev.quizData.questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      return {
        ...prev,
        quizData: {
          ...prev.quizData,
          questions: newQuestions,
        },
      };
    });
  };

  const updateQuizOption = (qIndex: number, oIndex: number, value: string) => {
    setLessonForm(prev => {
      const newQuestions = [...prev.quizData.questions];
      const newOptions = [...newQuestions[qIndex].options];
      const oldOptionValue = newOptions[oIndex];
      newOptions[oIndex] = value;

      // If the correct answer matches the old value, update it to the new value
      let newCorrectAnswer = newQuestions[qIndex].correctAnswer;
      if (newCorrectAnswer === oldOptionValue) {
        newCorrectAnswer = value;
      }

      newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions, correctAnswer: newCorrectAnswer };
      return {
        ...prev,
        quizData: {
          ...prev.quizData,
          questions: newQuestions,
        },
      };
    });
  };

  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    if (courseId) {
      try {
        await lessonApi.deleteLesson(lessonId);
        showSuccess('Lesson deleted successfully');
        loadChapters();
      } catch (error) {
        console.error('Error deleting lesson:', error);
        showError('Failed to delete lesson');
      }
    } else {
      const updatedChapters = (chapters as LocalChapter[]).map(chapter => {
        if (chapter.id === chapterId) {
          return {
            ...chapter,
            lessons: (chapter.lessons || []).filter(l => l.id !== lessonId)
          };
        }
        return chapter;
      });
      setChapters(updatedChapters);
      onChaptersChange?.(updatedChapters);
      showSuccess('Lesson removed locally');
    }
  };

  const moveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    const currentIndex = chapters.findIndex(c => c.id === chapterId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= chapters.length) return;

    const newChapters = [...chapters];
    [newChapters[currentIndex], newChapters[newIndex]] = [newChapters[newIndex], newChapters[currentIndex]];

    if (courseId) {
      // Update order in database
      try {
        await Promise.all(
          newChapters.map((chapter, index) =>
            chapterApi.updateChapter(chapter.id, { order: index + 1 })
          )
        );
        setChapters(newChapters);
        showSuccess('Chapter order updated');
      } catch (error) {
        console.error('Error updating chapter order:', error);
        showError('Failed to update chapter order');
      }
    } else {
      // Update locally
      const orderedChapters = newChapters.map((ch, idx) => ({
        ...ch,
        order: idx
      }));
      setChapters(orderedChapters);
      onChaptersChange?.(orderedChapters);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-none border border-[var(--border)]">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Course Curriculum</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Manage your course chapters and lessons</p>
            </div>
            <Button type="button" variant="primary" onClick={handleCreateChapter} className="shadow-lg hover:shadow-xl transition-all">
              <HiPlus className="w-5 h-5 mr-2" />
              Add Chapter
            </Button>
          </div>
        </div>

        {chapters.length === 0 ? (
          <Card padding="lg" className="border-dashed border-2 bg-[var(--muted)]/20">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-none flex items-center justify-center mx-auto mb-4">
                <HiPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">No chapters yet</h3>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
                Start building your course structure by adding your first chapter.
              </p>
              <Button type="button" variant="primary" onClick={handleCreateChapter}>
                <HiPlus className="w-5 h-5 mr-2" />
                Add Your First Chapter
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {(chapters as (Chapter | LocalChapter)[]).map((chapter, index) => (
              <Card key={chapter.id} padding="none" className="overflow-hidden border-[var(--border)] hover:border-blue-300 transition-colors shadow-sm hover:shadow-md">
                <div className={classNames(
                  "flex items-center justify-between p-4 cursor-pointer select-none",
                  expandedChapters.has(chapter.id) ? "bg-blue-50/50" : "bg-white"
                )} onClick={() => toggleChapter(chapter.id)}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-8 h-8 rounded-none bg-gray-100 text-gray-500 font-bold text-xs uppercase">
                      CH {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--foreground)] text-lg">
                        {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className="text-sm text-[var(--muted-foreground)] line-clamp-1">
                          {chapter.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 mr-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveChapter(chapter.id, 'up')}
                        disabled={index === 0}
                        className="hover:bg-blue-100"
                      >
                        <HiChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveChapter(chapter.id, 'down')}
                        disabled={index === chapters.length - 1}
                        className="hover:bg-blue-100"
                      >
                        <HiChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleEditChapter(chapter)} className="hover:bg-blue-100 text-blue-600">
                      <HiPencil className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteChapter(chapter.id)} className="hover:bg-red-100 text-red-600">
                      <HiTrash className="w-4 h-4" />
                    </Button>
                    <div className="ml-2">
                      {expandedChapters.has(chapter.id) ? (
                        <HiChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <HiChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>


                {expandedChapters.has(chapter.id) && (
                  <div className="bg-gray-50/50 p-4 border-t border-[var(--border)]">
                    <div className="space-y-3">
                      {chapter.lessons && chapter.lessons.length > 0 ? (
                        (chapter.lessons as (Lesson | LocalLesson)[]).map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-none bg-white border border shadow-sm hover:border-blue-200 transition-all group">
                            <div className="flex items-center justify-center w-6 h-6 rounded-none bg-blue-50 text-blue-600 font-bold text-[10px]">
                              {lessonIndex + 1}
                            </div>
                            <div className="flex items-center gap-3 flex-1">
                              {lesson.lessonType === 'VIDEO' && <HiPlay className="w-5 h-5 text-blue-500" />}
                              {lesson.lessonType === 'TEXT' && <HiDocument className="w-5 h-5 text-green-500" />}
                              {lesson.lessonType === 'PDF' && <HiDocument className="w-5 h-5 text-red-500" />}
                              {lesson.lessonType === 'QUIZ' && <HiClipboard className="w-5 h-5 text-purple-500" />}
                              {lesson.lessonType === 'ASSIGNMENT' && <HiClipboard className="w-5 h-5 text-orange-500" />}
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[var(--foreground)]">{lesson.title}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-gray-100 text-gray-500 font-medium">
                                    {lesson.lessonType}
                                  </span>
                                </div>
                                {lesson.description && (
                                  <span className="text-xs text-[var(--muted-foreground)] line-clamp-1">
                                    {lesson.description}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 ml-auto">
                                {lesson.isPreview && (
                                  <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-none font-bold uppercase tracking-wider">
                                    Preview
                                  </span>
                                )}
                                {lesson.isLocked && (
                                  <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-none font-bold uppercase tracking-wider">
                                    Locked
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleEditLesson(lesson)} className="hover:bg-blue-100 text-blue-600">
                                <HiPencil className="w-4 h-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteLesson(chapter.id, lesson.id)} className="hover:bg-red-100 text-red-600">
                                <HiTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 bg-white border border-dashed rounded-none">
                          <p className="text-[var(--muted-foreground)] text-sm mb-3">
                            No lessons in this chapter yet.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateLesson(chapter.id)}
                          >
                            <HiPlus className="w-4 h-4 mr-2" />
                            Add Your First Lesson
                          </Button>
                        </div>
                      )}
                      {chapter.lessons && chapter.lessons.length > 0 && (
                        <div className="flex justify-center pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 font-bold"
                            onClick={() => handleCreateLesson(chapter.id)}
                          >
                            <HiPlus className="w-4 h-4 mr-2" />
                            Add Lesson
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Chapter Modal */}
      <Modal
        isOpen={showChapterModal}
        onClose={() => setShowChapterModal(false)}
        title={editingChapter ? 'Edit Chapter' : 'Create Chapter'}
      >
        <div className="space-y-4">
          <Input
            label="Chapter Title *"
            value={chapterForm.title}
            onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter chapter title"
            required
          />

          <Textarea
            label="Description"
            value={chapterForm.description}
            onChange={(e) => setChapterForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter chapter description (optional)"
            rows={3}
          />

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={chapterForm.isLocked}
                onChange={(e) => setChapterForm(prev => ({ ...prev, isLocked: e.target.checked }))}
                className="rounded-none"
              />
              <span className="text-sm">Locked</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={chapterForm.isPreview}
                onChange={(e) => setChapterForm(prev => ({ ...prev, isPreview: e.target.checked }))}
                className="rounded-none"
              />
              <span className="text-sm">Preview</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowChapterModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveChapter}>
              {editingChapter ? 'Update' : 'Create'} Chapter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lesson Modal */}
      <Modal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        title={editingLesson ? 'Edit Lesson' : 'Create Lesson'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Lesson Title *"
            value={lessonForm.title}
            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter lesson title"
            required
          />

          <Textarea
            label="Description"
            value={lessonForm.description}
            onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter lesson description (optional)"
            rows={2}
          />

          <Select
            label="Lesson Type"
            value={lessonForm.lessonType}
            onChange={(e) => {
              const value = (e.target as HTMLSelectElement).value;
              setLessonForm(prev => ({ ...prev, lessonType: value as any }));
            }}
            options={[
              { value: 'VIDEO', label: 'Video' },
              { value: 'TEXT', label: 'Text' },
              { value: 'PDF', label: 'PDF' },
              { value: 'QUIZ', label: 'Quiz' },
              { value: 'ASSIGNMENT', label: 'Assignment' },
            ]}
          />

          {lessonForm.lessonType === 'VIDEO' && (
            <>
              <Input
                label="Video URL"
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://example.com/video.mp4"
              />

              <Input
                label="Video Duration (seconds)"
                type="number"
                value={lessonForm.videoDuration || ''}
                onChange={(e) => setLessonForm(prev => ({ ...prev, videoDuration: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />

              <FileUpload
                label="Upload Video File"
                accept="video/*"
                maxSize={500}
                value={lessonForm.videoFile}
                onChange={(file) => setLessonForm(prev => ({ ...prev, videoFile: file }))}
                helperText="Upload video file (max 500MB)"
              />
            </>
          )}

          {lessonForm.lessonType === 'PDF' && (
            <FileUpload
              label="Upload PDF File"
              accept=".pdf"
              maxSize={50}
              value={lessonForm.attachmentFile}
              onChange={(file) => setLessonForm(prev => ({ ...prev, attachmentFile: file }))}
              helperText="Upload PDF file (max 50MB)"
            />
          )}

          {lessonForm.lessonType === 'QUIZ' && (
            <div className="space-y-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Quiz Questions</h3>
                <Button type="button" variant="outline" size="sm" onClick={addQuizQuestion}>
                  <HiPlus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              <div className="space-y-8">
                {lessonForm.quizData.questions.map((q, qIndex) => (
                  <div key={qIndex} className="p-4 border border-gray-200 rounded-none bg-gray-50 space-y-4 relative">
                    <button
                      type="button"
                      onClick={() => removeQuizQuestion(qIndex)}
                      className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded-none"
                    >
                      <HiX className="w-5 h-5" />
                    </button>

                    <Input
                      label={`Question ${qIndex + 1}`}
                      value={q.question}
                      onChange={(e) => updateQuizQuestion(qIndex, 'question', e.target.value)}
                      placeholder="Enter question text"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctAnswer === option && option !== ''}
                            onChange={() => updateQuizQuestion(qIndex, 'correctAnswer', option)}
                            className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          />
                          <Input
                            value={option}
                            onChange={(e) => updateQuizOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center space-x-4">
                      <Input
                        label="Points"
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuizQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                        className="w-24"
                      />
                      <div className="text-xs text-gray-500 pt-6">
                        * Select the radio button next to the correct option
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(lessonForm.lessonType === 'TEXT' || lessonForm.lessonType === 'ASSIGNMENT') ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {lessonForm.lessonType === 'TEXT' ? 'Lesson Content' : 'Assignment Instructions'}
              </label>
              <RichTextEditor
                value={lessonForm.content}
                onChange={(content) => setLessonForm(prev => ({ ...prev, content }))}
                placeholder="Enter detailed content here..."
              />
            </div>
          ) : lessonForm.lessonType !== 'QUIZ' && (
            <Textarea
              label="Additional Notes / Content"
              value={lessonForm.content}
              onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter lesson content (optional)"
              rows={4}
            />
          )}

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={lessonForm.isLocked}
                onChange={(e) => setLessonForm(prev => ({ ...prev, isLocked: e.target.checked }))}
                className="rounded-none"
              />
              <span className="text-sm">Locked</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={lessonForm.isPreview}
                onChange={(e) => setLessonForm(prev => ({ ...prev, isPreview: e.target.checked }))}
                className="rounded-none"
              />
              <span className="text-sm">Preview</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowLessonModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveLesson}>
              {editingLesson ? 'Update' : 'Create'} Lesson
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
