// src/app/(routes)/tracking/page.tsx

import React from 'react';
import { TrackingHub } from '@/components/tracking/TrackingHub';

export default function TrackingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <TrackingHub />
    </div>
  );
}
