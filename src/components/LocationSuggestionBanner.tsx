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
      <div className="fixed bottom-4 z-50 left-4 w-[calc(30vw-2rem)] md:left-4 md:w-[calc(30vw-2rem)] mobile:left-1/2 mobile:w-[90%] mobile:transform mobile:-translate-x-1/2 mobile:max-w-none">
        <div 
          className="relative p-3 border border-gray-300 rounded-md bg-[#EDE8F5] shadow-md"
          style={{
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