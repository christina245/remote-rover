import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Wifi, Zap, Dog, Volume2, CupSoda, Pizza, ClockAlert, Bus, Star, Navigation, Accessibility, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [isLoading, setIsLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    
    // Check if Google Maps is already loaded
    if (window.googleMapsLoaded) {
      setGoogleMapsLoaded(true);
    } else {
      // Listen for Google Maps load event
      const handleMapsLoaded = () => setGoogleMapsLoaded(true);
      window.addEventListener('google-maps-loaded', handleMapsLoaded);
      return () => window.removeEventListener('google-maps-loaded', handleMapsLoaded);
    }
  }, []);

  useEffect(() => {
    if (userLocation && googleMapsLoaded) {
      searchWorkspaces();
    }
  }, [searchLocation, filters, userLocation, googleMapsLoaded]);

  useEffect(() => {
    // Sort results when sortBy changes
    if (searchResults.length > 0) {
      const sortedResults = [...searchResults].sort((a, b) => {
        if (sortBy === 'distance') {
          return parseFloat(a.distance) - parseFloat(b.distance);
        } else {
          return b.rating - a.rating;
        }
      });
      setSearchResults(sortedResults);
    }
  }, [sortBy]);

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
      if (!userLocation || !googleMapsLoaded) return;
      
      setIsLoading(true);

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

      // Initialize Google Places service
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);

      // Search for different place types
      const placeTypes = ['cafe', 'library', 'lodging'];
      const allResults = [];

      for (const type of placeTypes) {
        const request = {
          location: new google.maps.LatLng(searchCoords.lat, searchCoords.lng),
          radius: 16093, // 10 miles in meters
          type: type === 'lodging' ? 'lodging' : type
        };

        const results = await new Promise<any[]>((resolve) => {
          service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              resolve(results || []);
            } else {
              resolve([]);
            }
          });
        });

        allResults.push(...results);
      }

      console.log(`Found ${allResults.length} total places`);
      
      // Process each place and filter by review content
      const processedResults = [];
      
      for (const place of allResults) {
        try {
          console.log(`Processing place: ${place.name}`);
          
          const details = await new Promise<any>((resolve) => {
            service.getDetails({
              placeId: place.place_id,
              fields: ['name', 'rating', 'user_ratings_total', 'opening_hours', 'photos', 'reviews', 'types', 'wheelchair_accessible_entrance', 'formatted_address']
            }, (result, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                resolve(result);
              } else {
                console.error(`Failed to get details for ${place.name}:`, status);
                resolve(null);
              }
            });
          });

          if (details && details.reviews && hasWorkReviews(details.reviews)) {
            const processedPlace = await processPlaceData(place, details, searchCoords);
            if (processedPlace) {
              processedResults.push(processedPlace);
              console.log(`Added ${place.name} to results`);
            }
          } else {
            console.log(`Filtered out ${place.name} - no work reviews`);
          }
        } catch (error) {
          console.error('Error processing place:', error);
        }
      }
      
      console.log(`Final results: ${processedResults.length} work-friendly places`);

      // Sort results by selected criteria
      const sortedResults = processedResults.sort((a, b) => {
        if (sortBy === 'distance') {
          return parseFloat(a.distance) - parseFloat(b.distance);
        } else {
          return b.rating - a.rating;
        }
      });

      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Error searching workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasWorkReviews = (reviews: any[]) => {
    console.log(`Checking reviews for place: ${reviews.length} total reviews`);
    
    for (const review of reviews) {
      const reviewText = review.text?.toLowerCase() || '';
      if (reviewText.includes('work')) {
        console.log('Found work-related review:', reviewText.slice(0, 100));
        return true;
      }
    }
    
    console.log('No work-related reviews found');
    return false;
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
      // Calculate distance
      const distance = calculateDistance(
        userCoords.lat, userCoords.lng,
        place.geometry.location.lat(), place.geometry.location.lng()
      );

      // Determine place type
      const types = place.types || [];
      let placeType = 'hotel'; // default
      if (types.includes('cafe') || types.includes('coffee_shop') || types.includes('bakery')) {
        placeType = 'cafe';
      } else if (types.includes('library')) {
        placeType = 'library';
      }

      // Get opening hours
      const openingHours = details.opening_hours;
      const isOpen = openingHours?.open_now || false;
      const todayHours = openingHours?.periods?.find((period: any) => 
        period.open?.day === new Date().getDay()
      );
      const closingTime = todayHours?.close ? 
        `${Math.floor(todayHours.close.time / 100)}:${(todayHours.close.time % 100).toString().padStart(2, '0')}` : 
        'Unknown';

      // Get best photo for workspace
      const photos = details.photos || [];
      const coverPhoto = photos.length > 0 ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photos[0].photo_reference}&key=${apiKeys.places}` :
        '/placeholder.svg';

      // Generate work-friendly summary from reviews
      const workFriendlySummary = generateWorkFriendlySummary(details.reviews || []);

      return {
        id: place.place_id,
        name: place.name,
        type: placeType,
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        isOpen,
        openUntil: isOpen ? closingTime : 'Closed',
        distance: distance.toFixed(1),
        isWheelchairAccessible: details.wheelchair_accessible_entrance || false,
        description: details.formatted_address || '',
        workFriendlySummary,
        coverPhoto,
        location: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
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

  const generateWorkFriendlySummary = (reviews: any[]) => {
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
            {isLoading ? 'Searching...' : `Found ${searchResults.length} work-friendly locations`}
          </p>
          <Select value={sortBy} onValueChange={(value: 'distance' | 'rating') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Sort by Distance</SelectItem>
              <SelectItem value="rating">Sort by Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SearchResultsList 
          results={searchResults}
          userLocation={userLocation}
        />
      </div>
    </div>
  );
};