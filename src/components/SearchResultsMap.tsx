import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface MapResult {
  id: string;
  name: string;
  type: 'cafe' | 'library' | 'hotel' | 'food_court' | string;
  location: { lat: number; lng: number };
}

interface SearchResultsMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  results: MapResult[];
}

export const SearchResultsMap: React.FC<SearchResultsMapProps> = ({ 
  apiKey, 
  center, 
  results 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (!mapRef.current) return;

    // Create custom pin markers for different place types
    const getPinColor = (type: string) => {
      switch (type) {
        case 'cafe': return 'blue';
        case 'library': return 'green';
        case 'hotel': return 'red';
        case 'food_court': return 'orange';
        default: return 'gray'; // Fallback color for unclassified
      }
    };

    // Generate markers string for static map with enhanced pin colors
    const markers = results.map(result => {
      const color = getPinColor(result.type);
      return `color:${color}|${result.location.lat},${result.location.lng}`;
    }).join('&markers=');

    // Use larger size for better desktop viewing with dynamic zoom
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=800x600&maptype=roadmap&markers=${markers}&key=${apiKey}`;

    mapRef.current.style.backgroundImage = `url(${mapUrl})`;
    mapRef.current.style.backgroundSize = 'cover';
    mapRef.current.style.backgroundPosition = 'center';
  }, [apiKey, center, results, zoom]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 1, 20));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef}
        className="w-full h-full bg-gray-200 rounded-lg"
      />
      
      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-muted transition-colors border-b"
          disabled={zoom >= 20}
        >
          <Plus size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-muted transition-colors"
          disabled={zoom <= 1}
        >
          <Minus size={20} />
        </button>
      </div>
    </div>
  );
};