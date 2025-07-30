import React, { useEffect, useRef, useState } from 'react';

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
  activeFilters?: Set<string>;
}

declare global {
  interface Window {
    google: any;
  }
}

export const SearchResultsMap: React.FC<SearchResultsMapProps> = ({ 
  apiKey, 
  center, 
  results,
  activeFilters = new Set(['cafe', 'library', 'hotel', 'food_court', 'other'])
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Custom marker icons for different place types
  const getMarkerIcon = (type: string, isSelected: boolean = false) => {
    const getColor = (type: string) => {
      switch (type) {
        case 'cafe': return '#4285F4'; // Blue
        case 'library': return '#34A853'; // Green
        case 'hotel': return '#EA4335'; // Red
        case 'food_court': return '#FF9800'; // Orange
        default: return '#9C27B0'; // Purple for 'other'
      }
    };

    const color = getColor(type);
    const borderStyle = isSelected ? `stroke="#FFFFFF" stroke-width="3"` : '';
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" 
                fill="${color}" ${borderStyle}/>
          <circle cx="12" cy="12" r="6" fill="#FFFFFF"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(24, 36),
      anchor: new window.google.maps.Point(12, 36)
    };
  };

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: 13,
      mapTypeId: 'roadmap',
      styles: [], // Default Google Maps styling
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false
    });

    mapInstanceRef.current = map;

    // Create info window for showing place names
    infoWindowRef.current = new window.google.maps.InfoWindow({
      pixelOffset: new window.google.maps.Size(0, -40)
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [center]);

  // Update markers when results or filters change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Filter results based on active filters
    const filteredResults = results.filter(result => 
      activeFilters.has(result.type) || activeFilters.has('other')
    );

    // Create new markers
    filteredResults.forEach(result => {
      const marker = new window.google.maps.Marker({
        position: result.location,
        map: mapInstanceRef.current,
        title: result.name,
        icon: getMarkerIcon(result.type, selectedMarkerId === result.id)
      });

      // Add click listener
      marker.addListener('click', () => {
        // Update selected marker
        setSelectedMarkerId(result.id);
        
        // Get text color based on marker type
        const getTextColor = (type: string) => {
          switch (type) {
            case 'cafe': return '#4285F4';
            case 'library': return '#34A853';
            case 'hotel': return '#EA4335';
            case 'food_court': return '#FF9800';
            default: return '#9C27B0';
          }
        };

        // Show simple name label
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="
              font-family: 'IBM Plex Sans Devanagari', sans-serif;
              font-size: 14px;
              font-weight: 700;
              color: ${getTextColor(result.type)};
              text-shadow: 2px 2px 0 #FFFFFF, -2px -2px 0 #FFFFFF, 2px -2px 0 #FFFFFF, -2px 2px 0 #FFFFFF;
              padding: 0;
              margin: 0;
              border: none;
              background: transparent;
            ">
              ${result.name}
            </div>
          `);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (filteredResults.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredResults.forEach(result => {
        bounds.extend(result.location);
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [results, activeFilters, selectedMarkerId]);

  // Update selected marker icon when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      const result = results.filter(r => 
        activeFilters.has(r.type) || activeFilters.has('other')
      )[index];
      
      if (result) {
        marker.setIcon(getMarkerIcon(result.type, selectedMarkerId === result.id));
      }
    });
  }, [selectedMarkerId, results, activeFilters]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef}
        className="w-full h-full bg-gray-200 rounded-lg"
      />

      {/* Beta Banner */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-4/5 bg-[#1F496B] text-white p-3 rounded-lg text-sm">
        😬 Remote Rover is currently in beta, which means unwanted results may show up and desired results may not show up. Please report inappropriate locations.
      </div>
    </div>
  );
};