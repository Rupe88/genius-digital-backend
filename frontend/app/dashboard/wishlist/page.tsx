'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

export default function WishlistPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-8">My Wishlist</h1>
      <Card padding="lg">
        <p className="text-[var(--muted-foreground)]">Wishlist coming soon...</p>
      </Card>
    </div>
  );
}

