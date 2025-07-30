import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationSuggestionModal } from './LocationSuggestionModal';

export const LocationSuggestionBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isVisible) return null;

  return (
    <>
      <div className="relative bg-[#3E2098] text-white p-3 rounded-lg text-sm mx-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="absolute right-1 top-1 h-6 w-6 text-white hover:bg-white/20"
        >
          <X className="h-3 w-3" />
        </Button>
        
        <p className="pr-8">
          Know a place that should appear in the results but isn't?{' '}
          <button
            onClick={() => setIsModalOpen(true)}
            className="underline font-medium hover:no-underline"
          >
            Let us know!
          </button>
        </p>
      </div>

      <LocationSuggestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};