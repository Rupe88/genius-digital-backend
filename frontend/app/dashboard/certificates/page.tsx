'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

export default function CertificatesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-8">My Certificates</h1>
      <Card padding="lg">
        <p className="text-[var(--muted-foreground)]">Certificates coming soon...</p>
      </Card>
    </div>
  );
}

