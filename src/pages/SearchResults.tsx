import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Zap, Dog, Volume2, CupSoda, Pizza, ClockAlert, Bus, Star, Navigation, Accessibility } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SearchResultsMap } from '@/components/SearchResultsMap';
import { SearchResultsList } from '@/components/SearchResultsList';

const remoteRoverLogo = '/lovable-uploads/c065750f-ed6d-4fd1-9952-2daae5eb3972.png';

interface FilterChip {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const filterChips: FilterChip[] = [
  { id: 'wifi', label: 'Wifi', icon: <Wifi size={16} /> },
  { id: 'outlets', label: 'Outlets', icon: <Zap size={16} /> },
  { id: 'pet-friendly', label: 'Pet-friendly', icon: <Dog size={16} /> },
  { id: 'quiet', label: 'Quiet area', icon: <Volume2 size={16} /> },
  { id: 'transit', label: 'Near public transit', icon: <Bus size={16} /> },
  { id: 'boba', label: 'Has boba', icon: <CupSoda size={16} /> },
  { id: 'food', label: 'Has food', icon: <Pizza size={16} /> },
  { id: 'late', label: 'Open late', icon: <ClockAlert size={16} /> },
];

interface SearchResultsProps {
  apiKeys: {
    geocoding: string;
    geolocation: string;
    mapsStatic: string;
    places: string;
  };
  searchLocation?: string;
  selectedFilters?: Set<string>;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  apiKeys, 
  searchLocation = 'San Francisco, CA', 
  selectedFilters = new Set(['wifi', 'outlets']) 
}) => {
  const [location, setLocation] = useState(searchLocation);
  const [filters, setFilters] = useState(selectedFilters);
  const [searchResults, setSearchResults] = useState([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    getCurrentLocation();
    searchWorkspaces();
  }, [location, filters]);

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to San Francisco if location is denied
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  };

  const searchWorkspaces = async () => {
    try {
      // This will use Google Places API to search for cafes, libraries, hotels
      // with work-friendly keywords in reviews
      const mockResults = [
        {
          id: '1',
          name: 'Cafe Name',
          type: 'cafe',
          rating: 4.1,
          reviewCount: 120,
          isOpen: true,
          closingTime: '9 pm',
          distance: '1.3 mi',
          isWheelchairAccessible: true,
          description: 'Pull description from Google Maps here! Maximum three lines, overflow.',
          workFriendlySummary: '✨ AI-generated summary of reviews that mention the user\'s selected tags, such as a diverse drink menu, plenty of outlets, or affordable food. Max 150 characters and 6 lines.',
          coverPhoto: '/placeholder.svg',
          location: { lat: 37.7849, lng: -122.4094 }
        },
        {
          id: '2',
          name: 'Library Name',
          type: 'library',
          rating: 4.1,
          reviewCount: 120,
          isOpen: true,
          closingTime: '9 pm',
          distance: '2.3 mi',
          isWheelchairAccessible: false,
          description: 'Pull description from Google Maps here! Maximum three lines, overflow.',
          workFriendlySummary: '✨ AI-generated summary of reviews that mention the user\'s selected tags, such as a diverse drink menu, plenty of outlets, or affordable food. Max 150 characters and 6 lines.',
          coverPhoto: '/placeholder.svg',
          location: { lat: 37.7649, lng: -122.4294 }
        }
      ];
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching workspaces:', error);
    }
  };

  const activeFilterChips = filterChips.filter(chip => filters.has(chip.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo and Search */}
      <div className="p-4 bg-background border-b">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={remoteRoverLogo} 
            alt="Remote Rover" 
            className="h-8 w-auto"
          />
        </div>
        
        {/* Search Bar */}
        <div 
          className="p-3 rounded-lg mb-4"
          style={{ backgroundColor: '#AC080B' }}
        >
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search by city or ZIP"
              className="w-full pl-10 h-10 bg-background border-0 rounded-lg shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Selected Filter Tags */}
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <div
              key={chip.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: '#3E2098' }}
            >
              {chip.icon}
              {chip.label}
            </div>
          ))}
        </div>
      </div>

      {/* Map Section */}
      <div className="h-64">
        <SearchResultsMap 
          apiKey={apiKeys.mapsStatic}
          center={userLocation || { lat: 37.7749, lng: -122.4194 }}
          results={searchResults}
        />
      </div>

      {/* Results List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-foreground">
            Showing locations within <span className="font-medium">10 miles</span>
          </p>
          <button className="text-sm text-primary font-medium">
            Sort by ▼
          </button>
        </div>

        <SearchResultsList 
          results={searchResults}
          userLocation={userLocation}
        />
      </div>
    </div>
  );
};