import React, { useEffect, useRef, useState } from 'react';

interface MapResult {
  id: string;
  name: string;
  type: 'cafe' | 'library' | 'hotel' | 'food_court' | string;
  location: { lat: number; lng: number };
  address?: string;
}

interface SearchResultsMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  results: MapResult[];
  activeFilters?: Set<string>;
  selectedMarkerId?: string | null;
}

declare global {
  interface Window {
    google: any;
    googleMapsLoaded?: boolean;
  }
}

export const SearchResultsMap: React.FC<SearchResultsMapProps> = ({ 
  apiKey, 
  center, 
  results,
  activeFilters = new Set(['cafe', 'library', 'hotel', 'food_court', 'other']),
  selectedMarkerId
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const resultsSignatureRef = useRef<string>('');

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
    const borderStyle = isSelected ? `stroke="#3E2098" stroke-width="3"` : '';
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 3C10.8 3 5 8.8 5 16c0 10.5 13 29 13 29s13-18.5 13-29c0-7.2-5.8-13-13-13z" 
                fill="${color}" ${borderStyle}/>
          <circle cx="18" cy="16" r="7" fill="#FFFFFF"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(36, 48),
      anchor: new window.google.maps.Point(18, 48)
    };
  };

  // Initialize Google Map
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) {
        console.log('Google Maps not ready yet', { 
          mapRef: !!mapRef.current, 
          google: !!window.google, 
          maps: !!window.google?.maps 
        });
        return;
      }

      console.log('Initializing Google Maps...');

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
      console.log('Map initialized successfully');

      // Create info window for showing place names - ensure it's properly initialized
      try {
        infoWindowRef.current = new window.google.maps.InfoWindow();
        console.log('InfoWindow created successfully');
      } catch (error) {
        console.error('Failed to create InfoWindow:', error);
      }
    };

    // Wait for Google Maps to be fully loaded
    if (window.googleMapsLoaded && window.google && window.google.maps && window.google.maps.InfoWindow) {
      console.log('Google Maps already loaded, initializing...');
      setTimeout(initializeMap, 100);
    } else {
      console.log('Waiting for Google Maps to load...');
      // Wait for Google Maps to load
      const handleGoogleMapsLoad = () => {
        console.log('Google Maps loaded event received');
        // Add a delay to ensure everything is ready
        setTimeout(initializeMap, 200);
      };

      window.addEventListener('google-maps-loaded', handleGoogleMapsLoad);
      
      return () => {
        window.removeEventListener('google-maps-loaded', handleGoogleMapsLoad);
      };
    }

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

    // Determine if results array actually changed (not just filter toggles)
    const currentResultsSignature = results.map(r => r.id).join('|');
    const resultsChanged = currentResultsSignature !== resultsSignatureRef.current;

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
        console.log('🔥 Marker clicked:', result.name, result.id);
        console.log('🔥 InfoWindow available:', !!infoWindowRef.current);
        console.log('🔥 Map instance available:', !!mapInstanceRef.current);
        
        // Marker click handled - highlighting managed by parent component

        // Show Google Maps style popup with location info
        if (infoWindowRef.current && mapInstanceRef.current) {
          console.log('🔥 Creating InfoWindow content for:', result.name);
          
          try {
            const content = `
              <div style="
                font-family: 'Roboto', sans-serif;
                font-size: 14px;
                line-height: 1.4;
                color: #202124;
                max-width: 200px;
              ">
                <div style="
                  font-weight: 500;
                  margin-bottom: 2px;
                ">
                  ${result.name}
                </div>
                ${result.address ? `<div style="color: #5f6368; margin-bottom: 8px;">${result.address}</div>` : ''}
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name + (result.address ? ' ' + result.address : ''))}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style="
                     color: #1a73e8;
                     text-decoration: none;
                     font-size: 13px;
                   ">
                  View on Google Maps
                </a>
              </div>
            `;
            
            console.log('🔥 Setting InfoWindow content...');
            infoWindowRef.current.setContent(content);
            
            console.log('🔥 Opening InfoWindow at position:', result.location);
            infoWindowRef.current.open({
              map: mapInstanceRef.current,
              anchor: marker
            });
            
            console.log('🔥 InfoWindow opened successfully');
          } catch (error) {
            console.error('🔥 Error creating/opening InfoWindow:', error);
          }
        } else {
          console.error('🔥 InfoWindow or Map instance not available', {
            infoWindow: !!infoWindowRef.current,
            map: !!mapInstanceRef.current
          });
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds only when the underlying results changed (not when toggling filter chips)
    if (filteredResults.length > 0 && resultsChanged) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredResults.forEach(result => bounds.extend(result.location));
      mapInstanceRef.current.fitBounds(bounds);
    }

    // Update signature after processing
    resultsSignatureRef.current = currentResultsSignature;
  }, [results, activeFilters, selectedMarkerId]);

  // Update selected marker icon when selection changes and auto-pan to selected marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    let selectedMarker: any = null;
    
    markersRef.current.forEach((marker, index) => {
      const result = results.filter(r => 
        activeFilters.has(r.type) || activeFilters.has('other')
      )[index];
      
      if (result) {
        const isSelected = selectedMarkerId === result.id;
        marker.setIcon(getMarkerIcon(result.type, isSelected));
        
        if (isSelected) {
          selectedMarker = marker;
        }
      }
    });

    // Auto-pan to selected marker, ensuring it's visible in the left portion of the map
    // (not hidden under the location details panel)
    if (selectedMarker && selectedMarkerId) {
      const position = selectedMarker.getPosition();
      if (position) {
        // Pan the map so the selected marker is visible in the left 67% of the map
        // (since 30% is covered by location details + 3% gap = 33% from right)
        const bounds = mapInstanceRef.current.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          
          // Calculate the visible area (left 67% of the map)
          const visibleLngRange = (ne.lng() - sw.lng()) * 0.67;
          const targetLng = sw.lng() + visibleLngRange * 0.5; // Center of visible area
          
          mapInstanceRef.current.panTo({
            lat: position.lat(),
            lng: targetLng
          });
        }
      }
    }
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