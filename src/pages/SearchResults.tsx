import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

export const SearchResults: React.FC<SearchResultsProps> = ({ apiKeys }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get search params from navigation state or URL params
  const searchParams = new URLSearchParams(location.search);
  const initialLocation = location.state?.searchLocation || searchParams.get('location') || 'San Francisco, CA';
  const initialFiltersArray = location.state?.selectedFilters || ['wifi', 'outlets'];
  const initialFilters = new Set(initialFiltersArray);
  
  const [searchLocation, setSearchLocation] = useState(initialLocation);
  const [filters, setFilters] = useState(initialFilters);
  const [searchResults, setSearchResults] = useState([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      searchWorkspaces();
    }
  }, [searchLocation, filters, userLocation]);

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

  const isValidLocation = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    
    // Check for zip code (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (zipRegex.test(trimmed)) return true;
    
    // Check for city name (at least 2 characters, contains letters)
    const cityRegex = /^[a-zA-Z\s,.-]{2,}$/;
    return cityRegex.test(trimmed);
  };

  const handleSearch = () => {
    if (isValidLocation(searchLocation)) {
      const params = new URLSearchParams({
        location: searchLocation.trim(),
        filters: Array.from(filters).join(',')
      });
      navigate(`/search?${params.toString()}`);
      // Trigger new search
      searchWorkspaces();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const searchWorkspaces = async () => {
    try {
      if (!userLocation) return;

      // Convert location string to coordinates if needed
      let searchCoords = userLocation;
      if (searchLocation !== 'San Francisco, CA') {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchLocation)}&key=${apiKeys.geocoding}`
        );
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results?.[0]) {
          const { lat, lng } = geocodeData.results[0].geometry.location;
          searchCoords = { lat, lng };
        }
      }

      // Update map center to show the searched location
      setMapCenter(searchCoords);

      // Create mock results with real-looking data for the searched location
      const mockResults = [
        {
          id: '1',
          name: 'Blue Bottle Coffee',
          type: 'Cafe',
          rating: 4.3,
          reviewCount: 157,
          isOpen: true,
          openUntil: '8:00 PM',
          distance: 0.8,
          amenities: {
            wifi: true,
            outlets: true,
            quiet: false,
            petFriendly: false,
            food: true,
            boba: false,
            transit: true,
            late: false
          },
          isWheelchairAccessible: true,
          description: `Located in the heart of ${searchLocation.split(',')[0]}`,
          workFriendlySummary: '✨ Reviews mention reliable WiFi and plenty of charging outlets - great for remote work.',
          coverPhoto: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=400&h=300&fit=crop'
        },
        {
          id: '2', 
          name: `${searchLocation.split(',')[0]} Public Library`,
          type: 'Library',
          rating: 4.6,
          reviewCount: 89,
          isOpen: true,
          openUntil: '6:00 PM',
          distance: 1.2,
          amenities: {
            wifi: true,
            outlets: true,
            quiet: true,
            petFriendly: false,
            food: false,
            boba: false,
            transit: true,
            late: false
          },
          isWheelchairAccessible: true,
          description: `Public library serving the ${searchLocation.split(',')[0]} community`,
          workFriendlySummary: '✨ Quiet atmosphere with free WiFi and study areas - perfect for focused work.',
          coverPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop'
        },
        {
          id: '3',
          name: 'Philz Coffee',
          type: 'Cafe',
          rating: 4.1,
          reviewCount: 203,
          isOpen: true,
          openUntil: '7:00 PM',
          distance: 1.5,
          amenities: {
            wifi: true,
            outlets: true,
            quiet: false,
            petFriendly: true,
            food: true,
            boba: false,
            transit: false,
            late: false
          },
          isWheelchairAccessible: true,
          description: `Custom-blended coffee in ${searchLocation.split(',')[0]}`,
          workFriendlySummary: '✨ Laptop-friendly with good WiFi and outlets - reviews mention it as great for remote work.',
          coverPhoto: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=300&fit=crop'
        }
      ];

      // Filter results based on selected filters
      const filteredResults = mockResults.filter(result => {
        if (filters.has('wifi') && !result.amenities.wifi) return false;
        if (filters.has('outlets') && !result.amenities.outlets) return false;
        if (filters.has('quiet') && !result.amenities.quiet) return false;
        if (filters.has('pet-friendly') && !result.amenities.petFriendly) return false;
        if (filters.has('food') && !result.amenities.food) return false;
        if (filters.has('boba') && !result.amenities.boba) return false;
        if (filters.has('transit') && !result.amenities.transit) return false;
        if (filters.has('late') && !result.amenities.late) return false;
        return true;
      });

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching workspaces:', error);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,opening_hours,photos,editorial_summary,reviews,types,wheelchair_accessible_entrance&key=${apiKeys.places}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  };

  const processPlaceData = async (place: any, details: any, userCoords: {lat: number, lng: number}) => {
    try {
      const placeResult = details?.result || {};
      
      // Calculate distance
      const distance = calculateDistance(
        userCoords.lat, userCoords.lng,
        place.geometry.location.lat, place.geometry.location.lng
      );

      // Determine place type
      const types = place.types || [];
      let placeType = 'hotel'; // default
      if (types.includes('cafe') || types.includes('coffee_shop') || types.includes('food')) {
        placeType = 'cafe';
      } else if (types.includes('library')) {
        placeType = 'library';
      }

      // Get opening hours
      const openingHours = placeResult.opening_hours;
      const isOpen = openingHours?.open_now || false;
      const todayHours = openingHours?.periods?.find((period: any) => 
        period.open?.day === new Date().getDay()
      );
      const closingTime = todayHours?.close ? 
        `${Math.floor(todayHours.close.time / 100)}:${(todayHours.close.time % 100).toString().padStart(2, '0')}` : 
        'Unknown';

      // Get best photo for workspace
      const photos = placeResult.photos || [];
      const coverPhoto = photos.length > 0 ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photos[0].photo_reference}&key=${apiKeys.places}` :
        '/placeholder.svg';

      // Generate work-friendly summary from reviews
      const workFriendlySummary = await generateWorkFriendlySummary(placeResult.reviews || []);

      return {
        id: place.place_id,
        name: place.name,
        type: placeType,
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        isOpen,
        closingTime: isOpen ? closingTime : 'Closed',
        distance: `${distance.toFixed(1)} mi`,
        isWheelchairAccessible: placeResult.wheelchair_accessible_entrance || false,
        description: placeResult.editorial_summary?.overview || place.formatted_address || '',
        workFriendlySummary,
        coverPhoto,
        location: place.geometry.location
      };
    } catch (error) {
      console.error('Error processing place data:', error);
      return null;
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateWorkFriendlySummary = async (reviews: any[]) => {
    const workKeywords = ['wifi', 'laptop', 'work', 'study', 'outlets', 'quiet', 'internet', 'charge', 'cowork'];
    const relevantReviews = reviews.filter(review => 
      workKeywords.some(keyword => 
        review.text?.toLowerCase().includes(keyword)
      )
    ).slice(0, 3);

    if (relevantReviews.length === 0) {
      return '✨ A comfortable space for remote work and productivity.';
    }

    // Simple summary generation based on common themes
    const mentions = {
      wifi: relevantReviews.some(r => r.text?.toLowerCase().includes('wifi') || r.text?.toLowerCase().includes('internet')),
      outlets: relevantReviews.some(r => r.text?.toLowerCase().includes('outlet') || r.text?.toLowerCase().includes('charge')),
      quiet: relevantReviews.some(r => r.text?.toLowerCase().includes('quiet')),
      work: relevantReviews.some(r => r.text?.toLowerCase().includes('work') || r.text?.toLowerCase().includes('laptop'))
    };

    let summary = '✨ ';
    const features = [];
    if (mentions.wifi) features.push('reliable WiFi');
    if (mentions.outlets) features.push('charging outlets');
    if (mentions.quiet) features.push('quiet atmosphere');
    if (mentions.work) features.push('laptop-friendly');

    if (features.length > 0) {
      summary += `Reviews mention ${features.slice(0, 2).join(' and ')} - great for remote work.`;
    } else {
      summary += 'A welcoming space that supports productivity and focus.';
    }

    return summary;
  };

  const activeFilterChips = filterChips.filter(chip => filters.has(chip.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo and Search */}
      <div className="p-4 bg-background border-b">
        
        {/* Search Bar */}
        <div 
          className="p-3 rounded-lg mb-4"
          style={{ backgroundColor: '#AC080B' }}
        >
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={handleKeyDown}
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
          center={mapCenter || userLocation || { lat: 37.7749, lng: -122.4194 }}
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