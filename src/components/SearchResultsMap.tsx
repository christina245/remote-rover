import React, { useEffect, useRef } from 'react';

interface MapResult {
  id: string;
  name: string;
  type: 'cafe' | 'library' | 'hotel';
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

  useEffect(() => {
    if (!mapRef.current) return;

    // Create custom pin markers for different place types
    const getPinColor = (type: string) => {
      switch (type) {
        case 'cafe': return 'blue';
        case 'library': return 'green';
        case 'hotel': return 'red';
        default: return 'red'; // Default to hotel pin
      }
    };

    // Generate markers string for static map
    const markers = results.map(result => {
      const color = getPinColor(result.type);
      return `color:${color}|${result.location.lat},${result.location.lng}`;
    }).join('&markers=');

    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=13&size=400x256&maptype=roadmap&markers=${markers}&key=${apiKey}`;

    mapRef.current.style.backgroundImage = `url(${mapUrl})`;
    mapRef.current.style.backgroundSize = 'cover';
    mapRef.current.style.backgroundPosition = 'center';
  }, [apiKey, center, results]);

  return (
    <div 
      ref={mapRef}
      className="w-full h-full bg-gray-200 rounded-lg"
    />
  );
};