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
      <div className="fixed bottom-4 left-4 right-4 z-10">
        <div 
          className="relative p-3 mx-4"
          style={{
            borderRadius: '5px',
            border: '1px solid #D9D9D9',
            background: '#EDE8F5',
            boxShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.25)'
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="absolute right-1 top-1 h-6 w-6 hover:bg-black/10"
            style={{ color: '#3E2098' }}
          >
            <X className="h-3 w-3" />
          </Button>
          
          <p 
            className="pr-8"
            style={{
              color: '#000',
              fontFamily: 'IBM Plex Sans Devanagari',
              fontSize: '12px',
              fontWeight: 300,
              lineHeight: '100%'
            }}
          >
            Know a place that should appear in the results but isn't?{' '}
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                color: '#3E2098',
                fontFamily: 'IBM Plex Sans Devanagari',
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: '100%',
                textDecoration: 'underline'
              }}
              className="hover:no-underline"
            >
              Let us know!
            </button>
          </p>
        </div>
      </div>

      <LocationSuggestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};