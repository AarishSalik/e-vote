
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BackButton({ className, fallback = '/' }: { className?: string; fallback?: string }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // This check ensures that we only determine navigation ability on the client-side,
    // after the component has mounted.
    if (typeof window !== 'undefined') {
        // We can go back if the history has more than 1 entry.
        setCanGoBack(window.history.length > 1);
    }
  }, []);
  
  const handleClick = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="mr-2" />
      Back
    </Button>
  );
}
