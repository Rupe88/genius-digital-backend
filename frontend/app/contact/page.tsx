'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setError('');
      setIsLoading(true);
      // TODO: Integrate with contact API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      reset();
    } catch (err: any) {
      setError((err instanceof Error ? err.message : 'An error occurred') || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--muted)] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">Contact Us</h1>
          <p className="text-lg text-[var(--muted-foreground)]">
            Have a question? We'd love to hear from you.
          </p>
        </div>

        <Card padding="lg">
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-none text-sm">
              Message sent successfully!
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-none text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Name"
              type="text"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Enter your name"
            />

            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="Enter your email"
            />

            <Input
              label="Subject"
              type="text"
              {...register('subject')}
              error={errors.subject?.message}
              placeholder="Enter subject"
            />

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Message
              </label>
              <textarea
                {...register('message')}
                rows={6}
                className="w-full px-4 py-2 border border-[var(--border)] rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                placeholder="Enter your message"
              />
              {errors.message && (
                <p className="mt-1 text-sm text-[var(--error)]">{errors.message.message}</p>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Send Message
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

