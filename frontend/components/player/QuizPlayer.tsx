'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Quiz, QuizQuestion } from '@/lib/types/course';
import { QuizResult, submitQuiz } from '@/lib/api/quizzes';
import { showError, showSuccess } from '@/lib/utils/toast';
import { HiCheckCircle, HiXCircle, HiInformationCircle, HiChevronRight, HiChevronLeft, HiRefresh } from 'react-icons/hi';

interface QuizPlayerProps {
    quiz: Quiz;
    onComplete?: (result: QuizResult) => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const handleSelectAnswer = (answer: string) => {
        if (result) return; // Prevent changing answers after submission

        const questionId = currentQuestion.id!;
        if (currentQuestion.questionType === 'multiple_choice') {
            const currentAnswers = (selectedAnswers[questionId] as string[]) || [];
            if (currentAnswers.includes(answer)) {
                setSelectedAnswers({
                    ...selectedAnswers,
                    [questionId]: currentAnswers.filter((a) => a !== answer),
                });
            } else {
                setSelectedAnswers({
                    ...selectedAnswers,
                    [questionId]: [...currentAnswers, answer],
                });
            }
        } else {
            setSelectedAnswers({
                ...selectedAnswers,
                [questionId]: answer,
            });
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setShowExplanation(false);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            setShowExplanation(false);
        }
    };

    const handleSubmit = async () => {
        // Validate that all questions have been answered
        const unansweredCount = quiz.questions.filter(q => !selectedAnswers[q.id!]).length;
        if (unansweredCount > 0) {
            if (!confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
                return;
            }
        }

        try {
            setSubmitting(true);
            const answers = Object.entries(selectedAnswers).map(([questionId, answer]) => ({
                questionId,
                answer,
            }));
            const quizResult = await submitQuiz(quiz.id, answers);
            setResult(quizResult);
            showSuccess('Quiz submitted successfully!');
            if (onComplete) onComplete(quizResult);
        } catch (error) {
            showError(Object(error).message || 'Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const resetQuiz = () => {
        setResult(null);
        setSelectedAnswers({});
        setCurrentQuestionIndex(0);
        setShowExplanation(false);
    };

    if (result) {
        return (
            <Card padding="lg" className="max-w-4xl mx-auto border-2 border-[var(--border)] overflow-hidden">
                <div className={`p-8 text-center ${result.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex justify-center mb-6">
                        {result.passed ? (
                            <HiCheckCircle className="w-20 h-20 text-green-500 animate-bounce" />
                        ) : (
                            <HiXCircle className="w-20 h-20 text-red-500 animate-pulse" />
                        )}
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-2">
                        {result.passed ? 'Excellent Work!' : 'Keep Practicing!'}
                    </h2>
                    <p className="text-lg font-bold text-gray-600">
                        You scored <span className="text-[var(--primary-700)] text-3xl mx-1">{result.score}</span> out of {result.totalPoints} points
                    </p>
                    <div className="mt-4 inline-block px-6 py-2 rounded-none font-black uppercase tracking-widest text-sm bg-white shadow-sm">
                        {result.percentage.toFixed(0)}% Accuracy • {result.correctAnswers}/{result.totalQuestions} Correct
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <h3 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-4">Detailed Review</h3>
                    <div className="space-y-6">
                        {quiz.questions.map((q, idx) => {
                            const res = result.results.find(r => r.questionId === q.id);
                            return (
                                <div key={q.id} className={`p-6 rounded-none border ${res?.isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                                    <div className="flex items-start gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-none bg-white font-black text-gray-400 flex items-center justify-center border border-gray-100">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 space-y-4">
                                            <p className="font-bold text-gray-900 text-lg leading-tight">{q.question}</p>

                                            {/* Show options with right/wrong decorations */}
                                            <div className="grid grid-cols-1 gap-2">
                                                {Array.isArray(q.options) && q.options.map((option: string, oIdx: number) => {
                                                    const isUserAnswer = Array.isArray(res?.userAnswer)
                                                        ? (res?.userAnswer as string[]).includes(option)
                                                        : res?.userAnswer === option;

                                                    const isCorrectAnswer = Array.isArray(res?.correctAnswer)
                                                        ? (res?.correctAnswer as string[]).includes(option)
                                                        : res?.correctAnswer === option;

                                                    let bgColor = 'bg-white';
                                                    let borderColor = 'border-gray-100';
                                                    let icon = null;

                                                    if (isCorrectAnswer) {
                                                        bgColor = 'bg-green-100';
                                                        borderColor = 'border-green-500';
                                                        icon = <HiCheckCircle className="w-5 h-5 text-green-600" />;
                                                    } else if (isUserAnswer && !isCorrectAnswer) {
                                                        bgColor = 'bg-red-100';
                                                        borderColor = 'border-red-500';
                                                        icon = <HiXCircle className="w-5 h-5 text-red-600" />;
                                                    }

                                                    return (
                                                        <div key={oIdx} className={`flex items-center justify-between p-3 rounded-none border-2 ${borderColor} ${bgColor} transition-all`}>
                                                            <span className="text-sm font-bold text-gray-700">{option}</span>
                                                            {icon}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {q.description && (
                                                <div className="mt-4 p-4 rounded-none bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100 flex gap-3">
                                                    <HiInformationCircle className="w-5 h-5 flex-shrink-0" />
                                                    <p>{q.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center pt-8">
                        <Button variant="outline" size="lg" onClick={resetQuiz} className="rounded-none px-10 h-14 font-black">
                            <HiRefresh className="mr-2 w-5 h-5" /> Retake Quiz
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header / Progress */}
            <div className="bg-white p-6 rounded-none border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{quiz.title}</h2>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Question {currentQuestionIndex + 1} of {quiz.questions.length}
                    </p>
                </div>
                <div className="w-32 h-3 bg-gray-100 rounded-none overflow-hidden">
                    <div
                        className="h-full bg-[var(--primary-700)] transition-all duration-500"
                        style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <Card padding="none" className="overflow-hidden border-2 border-gray-200 transform transition-all shadow-xl">
                <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-[var(--primary-700)] rounded-none text-xs font-black uppercase tracking-[0.2em]">
                            {currentQuestion.questionType.replace('_', ' ')}
                        </span>
                        <h3 className="text-3xl font-black text-gray-900 leading-tight">
                            {currentQuestion.question}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {Array.isArray(currentQuestion.options) && (currentQuestion.options as string[]).map((option, index) => {
                            const questionId = currentQuestion.id!;
                            const isSelected = currentQuestion.questionType === 'multiple_choice'
                                ? ((selectedAnswers[questionId] as string[]) || []).includes(option)
                                : selectedAnswers[questionId] === option;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSelectAnswer(option)}
                                    className={`flex items-center gap-4 p-5 rounded-none border-4 text-left transition-all ${isSelected
                                            ? 'border-[var(--primary-700)] bg-blue-50/50 shadow-inner'
                                            : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                                        }`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-none flex items-center justify-center font-black ${isSelected ? 'bg-[var(--primary-700)] text-white' : 'bg-white text-gray-400 border border-gray-200'
                                        }`}>
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <span className={`text-lg font-bold flex-1 ${isSelected ? 'text-[var(--primary-700)]' : 'text-gray-700'}`}>
                                        {option}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-10 py-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="font-bold text-gray-500"
                    >
                        <HiChevronLeft className="mr-2 h-5 w-5" /> Previous
                    </Button>

                    {isLastQuestion ? (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleSubmit}
                            isLoading={submitting}
                            className="rounded-none px-12 h-14 font-black shadow-lg shadow-blue-700/20 active:scale-95 transition-transform"
                        >
                            Submit Quiz
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleNext}
                            className="rounded-none px-12 h-14 font-black shadow-lg shadow-blue-700/20 active:scale-95 transition-transform"
                        >
                            Next <HiChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};
