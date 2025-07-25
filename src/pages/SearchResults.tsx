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
      if (!userLocation) return;

      // Convert location string to coordinates if needed
      let searchCoords = userLocation;
      if (location !== 'San Francisco, CA') {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKeys.geocoding}`
        );
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results?.[0]) {
          const { lat, lng } = geocodeData.results[0].geometry.location;
          searchCoords = { lat, lng };
        }
      }

      const results = [];
      
      // Search for different place types
      const searchQueries = [
        'coffee shop wifi laptop work',
        'library study wifi',
        'hotel lobby wifi work',
        'coworking space',
        'cafe wifi outlets'
      ];

      for (const query of searchQueries) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${searchCoords.lat},${searchCoords.lng}&radius=16093&key=${apiKeys.places}`
        );
        
        const data = await response.json();
        
        if (data.results) {
          for (const place of data.results.slice(0, 3)) { // Limit results per query
            const placeDetails = await getPlaceDetails(place.place_id);
            const processedPlace = await processPlaceData(place, placeDetails, searchCoords);
            if (processedPlace) {
              results.push(processedPlace);
            }
          }
        }
      }

      // Remove duplicates and sort by distance
      const uniqueResults = results.filter((place, index, self) => 
        index === self.findIndex(p => p.id === place.id)
      );

      setSearchResults(uniqueResults.slice(0, 10)); // Limit to 10 results
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