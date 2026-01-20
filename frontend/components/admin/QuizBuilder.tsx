'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Quiz, QuizQuestion, QuestionType } from '@/lib/types/course';
import { HiPlus, HiTrash, HiDocument, HiCheckCircle, HiXCircle, HiPencil, HiArrowPath } from 'react-icons/hi2';

interface QuizBuilderProps {
  lessonId: string;
  quiz?: Quiz | null;
  onSave: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel?: () => void;
}

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  multiple_choice: <HiCheckCircle className="w-5 h-5 text-green-600" />,
  single_choice: <HiXCircle className="w-5 h-5 text-red-600" />,
  true_false: <HiDocument className="w-5 h-5 text-blue-600" />,
  open_ended: <HiPencil className="w-5 h-5 text-purple-600" />,
  short_answer: <HiArrowPath className="w-5 h-5 text-orange-600" />,
  matching: <HiDocument className="w-5 h-5 text-indigo-600" />,
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  single_choice: 'Single Choice',
  true_false: 'True/False',
  open_ended: 'Open Ended',
  short_answer: 'Short Answer',
  matching: 'Matching',
};

export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  lessonId,
  quiz,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [timeLimit, setTimeLimit] = useState(quiz?.timeLimit?.toString() || '');
  const [passingScore, setPassingScore] = useState(quiz?.passingScore?.toString() || '70');
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions || []);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      question: '',
      questionType: 'multiple_choice',
      description: '',
      options: null,
      correctAnswer: '',
      points: 1,
      order: questions.length,
    };
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    setSelectedQuestionIndex(updatedQuestions.length - 1);
  };

  const deleteQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    // Reorder remaining questions
    const reordered = updatedQuestions.map((q, i) => ({ ...q, order: i }));
    setQuestions(reordered);
    if (selectedQuestionIndex === index) {
      setSelectedQuestionIndex(null);
    } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
      setSelectedQuestionIndex(selectedQuestionIndex - 1);
    }
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleSave = async () => {
    try {
      await onSave({
        lessonId,
        title: title || `Quiz for Lesson ${lessonId.substring(0, 8)}`,
        description: description || undefined,
        timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
        passingScore: passingScore ? parseInt(passingScore) : 70,
        questions: questions.map((q, i) => ({ ...q, order: i })),
      });
    } catch (error) {
      console.error('Error saving quiz:', error);
      const message = error instanceof Error ? error.message : 'Failed to save quiz';
      alert(message);
    }
  };

  const selectedQuestion = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null;

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Quiz Builder</h2>
          {quiz && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Editing quiz for lesson
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button variant="primary" onClick={handleSave}>
            Save Quiz
          </Button>
        </div>
      </div>

      {/* Quiz Settings */}
      <Card padding="lg">
        <div className="space-y-4">
          <Input
            label="Quiz Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Quiz : Introduce about Product Design"
            required
          />
          <Textarea
            label="Quiz Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write here..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Time Limit (minutes)"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Passing Score (%)"
              type="number"
              min="0"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              required
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Questions List */}
        <div className="lg:col-span-1">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--foreground)]">Questions</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={addQuestion}
                className="flex items-center gap-2"
              >
                <HiPlus className="w-4 h-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {questions.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                  No questions yet. Click "Add" to create one.
                </p>
              ) : (
                questions.map((question, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedQuestionIndex(index)}
                    className={`p-3 rounded-none cursor-pointer transition-colors border ${selectedQuestionIndex === index
                      ? 'bg-green-50 border-green-300'
                      : 'bg-[var(--muted)] border-[var(--border)] hover:border-[var(--primary-300)]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {QUESTION_TYPE_ICONS[question.questionType as QuestionType]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {index + 1}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {QUESTION_TYPE_LABELS[question.questionType as QuestionType]}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--foreground)] truncate">
                          {question.question || 'Untitled Question'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteQuestion(index);
                        }}
                        className="flex-shrink-0 text-red-500 hover:text-red-700"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel - Question Editor */}
        <div className="lg:col-span-2">
          {selectedQuestion ? (
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Question {selectedQuestionIndex! + 1} ({QUESTION_TYPE_LABELS[selectedQuestion.questionType as QuestionType]})
              </h3>

              <div className="space-y-4">
                {/* Question Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Question Type
                  </label>
                  <select
                    value={selectedQuestion.questionType}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex!, {
                        questionType: e.target.value as QuestionType,
                        options: null,
                        correctAnswer: '',
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-none bg-[var(--background)] text-[var(--foreground)]"
                  >
                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Question
                  </label>
                  <Textarea
                    value={selectedQuestion.question}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex!, { question: e.target.value })
                    }
                    placeholder="Enter question text..."
                    rows={3}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    value={selectedQuestion.description || ''}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex!, { description: e.target.value })
                    }
                    placeholder="Write here..."
                    rows={2}
                  />
                </div>

                {/* Options based on question type */}
                {['multiple_choice', 'single_choice'].includes(selectedQuestion.questionType) && (
                  <QuestionOptionsEditor
                    question={selectedQuestion}
                    onUpdate={(updates) => updateQuestion(selectedQuestionIndex!, updates)}
                    multiple={selectedQuestion.questionType === 'multiple_choice'}
                  />
                )}

                {selectedQuestion.questionType === 'true_false' && (
                  <TrueFalseEditor
                    question={selectedQuestion}
                    onUpdate={(updates) => updateQuestion(selectedQuestionIndex!, updates)}
                  />
                )}

                {['short_answer', 'open_ended'].includes(selectedQuestion.questionType) && (
                  <ShortAnswerEditor
                    question={selectedQuestion}
                    onUpdate={(updates) => updateQuestion(selectedQuestionIndex!, updates)}
                    showCorrectAnswer={selectedQuestion.questionType === 'short_answer'}
                  />
                )}

                {/* Points */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Points
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedQuestion.points.toString()}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex!, {
                        points: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="lg">
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                {questions.length === 0
                  ? 'Click "Add" to create your first question'
                  : 'Select a question from the list to edit'}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Question Options Editor Component
const QuestionOptionsEditor: React.FC<{
  question: QuizQuestion;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
  multiple: boolean;
}> = ({ question, onUpdate, multiple }) => {
  const options = (question.options as string[]) || ['', ''];
  const correctAnswers = Array.isArray(question.correctAnswer)
    ? question.correctAnswer
    : question.correctAnswer
      ? [question.correctAnswer]
      : [];

  const updateOptions = (newOptions: string[]) => {
    onUpdate({ options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    updateOptions(newOptions);
  };

  const addOption = () => {
    updateOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      updateOptions(newOptions);
      // Remove from correct answers if needed
      if (correctAnswers.includes(options[index])) {
        const newCorrectAnswers = correctAnswers.filter((ans) => ans !== options[index]);
        onUpdate({
          correctAnswer: multiple ? newCorrectAnswers : newCorrectAnswers[0] || '',
        });
      }
    }
  };

  const toggleCorrectAnswer = (option: string) => {
    if (multiple) {
      const newCorrectAnswers = correctAnswers.includes(option)
        ? correctAnswers.filter((ans) => ans !== option)
        : [...correctAnswers, option];
      onUpdate({ correctAnswer: newCorrectAnswers });
    } else {
      onUpdate({ correctAnswer: option });
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
        Answer Options
      </label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 p-3 rounded-none border ${(multiple ? correctAnswers.includes(option) : correctAnswers[0] === option)
              ? 'bg-green-50 border-green-300'
              : 'bg-[var(--muted)] border-[var(--border)]'
              }`}
          >
            <button
              type="button"
              onClick={() => toggleCorrectAnswer(option)}
              className={`flex-shrink-0 w-5 h-5 rounded-none border-2 flex items-center justify-center ${(multiple ? correctAnswers.includes(option) : correctAnswers[0] === option)
                ? 'bg-green-500 border-green-600'
                : 'border-[var(--border)]'
                }`}
            >
              {(multiple ? correctAnswers.includes(option) : correctAnswers[0] === option) && (
                <HiCheckCircle className="w-4 h-4 text-white" />
              )}
            </button>
            <span className="text-sm font-medium">{String.fromCharCode(65 + index)}.</span>
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="text-red-500 hover:text-red-700"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addOption} className="w-full">
          <HiPlus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      </div>
    </div>
  );
};

// True/False Editor Component
const TrueFalseEditor: React.FC<{
  question: QuizQuestion;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
}> = ({ question, onUpdate }) => {
  const correctAnswer = question.correctAnswer === 'true' ? 'true' : 'false';

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
        Correct Answer
      </label>
      <div className="space-y-2">
        {['True', 'False'].map((option) => {
          const value = option.toLowerCase();
          const isSelected = correctAnswer === value;
          return (
            <div
              key={value}
              onClick={() => onUpdate({ correctAnswer: value })}
              className={`flex items-center gap-2 p-3 rounded-none border cursor-pointer ${isSelected
                ? 'bg-green-50 border-green-300'
                : 'bg-[var(--muted)] border-[var(--border)] hover:border-[var(--primary-300)]'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-none border-2 flex items-center justify-center ${isSelected ? 'border-green-600 bg-green-500' : 'border-[var(--border)]'
                  }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-none bg-white" />}
              </div>
              <span className="text-sm font-medium">{option}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Short Answer Editor Component
const ShortAnswerEditor: React.FC<{
  question: QuizQuestion;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
  showCorrectAnswer: boolean;
}> = ({ question, onUpdate, showCorrectAnswer }) => {
  return (
    <div>
      {showCorrectAnswer && (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Correct Answer
          </label>
          <Input
            value={question.correctAnswer as string}
            onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
            placeholder="Enter correct answer..."
          />
        </div>
      )}
      {!showCorrectAnswer && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Open-ended questions don't have a correct answer. They will be graded manually.
        </p>
      )}
    </div>
  );
};

