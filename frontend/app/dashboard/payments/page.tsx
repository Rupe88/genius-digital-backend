'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

export default function PaymentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-8">Payment History</h1>
      <Card padding="lg">
        <p className="text-[var(--muted-foreground)]">Payment history coming soon...</p>
      </Card>
    </div>
  );
}

