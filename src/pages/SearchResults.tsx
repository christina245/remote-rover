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

const remoteRoverLogo = '/lovable-uploads/851bb79d-eedc-4b82-a6f1-733ef4e3ee10.png';

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
  const initialFiltersParam = searchParams.get('filters');
  const initialFiltersArray = initialFiltersParam ? initialFiltersParam.split(',') : ['wifi', 'outlets'];
  const initialFilters = new Set(initialFiltersArray);
  
  const [searchLocation, setSearchLocation] = useState(initialLocation);
  const [filters, setFilters] = useState(initialFilters);
  const [searchResults, setSearchResults] = useState([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [radiusMiles, setRadiusMiles] = useState<number>(5);
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
      const placeTypes = ['cafe', 'coffee_shop', 'library', 'hotel'];
      const allResults = [];

      for (const type of placeTypes) {
        const request = {
          location: new google.maps.LatLng(searchCoords.lat, searchCoords.lng),
          radius: radiusMiles * 1609.34, // Convert miles to meters
          type: type === 'hotel' ? 'hotel' : type
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

      // Additional search for places with "cafe" or "coffee" in their names
      const nameBasedRequest = {
        location: new google.maps.LatLng(searchCoords.lat, searchCoords.lng),
        radius: radiusMiles * 1609.34,
        keyword: 'cafe coffee boba milk tea bubble tea tea'
      };

      const nameBasedResults = await new Promise<any[]>((resolve) => {
        service.nearbySearch(nameBasedRequest, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(results || []);
          } else {
            resolve([]);
          }
        });
      });

      // Filter name-based results to only include places with "cafe" or "coffee" in the name
      const filteredNameBasedResults = nameBasedResults.filter(place => {
        const nameLower = place.name?.toLowerCase() || '';
        return nameLower.includes('cafe') || nameLower.includes('coffee');
      });

      allResults.push(...filteredNameBasedResults);

      // Remove duplicates based on place_id
      const uniqueResults = allResults.filter((place, index, arr) => 
        arr.findIndex(p => p.place_id === place.place_id) === index
      );

      console.log(`Found ${uniqueResults.length} unique places after deduplication`);
      
      // Process each place and filter by review content
      const processedResults = [];
      
      for (const place of uniqueResults) {
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

          if (details && details.reviews && hasWorkReviews(details.reviews, details.types || [], place.name)) {
            const processedPlace = await processPlaceData(place, details, searchCoords);
            if (processedPlace && matchesSelectedFilters(processedPlace, details)) {
              processedResults.push(processedPlace);
              console.log(`Added ${place.name} to results`);
            } else {
              console.log(`Filtered out ${place.name} - doesn't match selected filters`);
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

  const isHotel = (types: string[]) => {
    return types.some(type => type.includes('lodging'));
  };

  const isValidPlaceType = (types: string[]) => {
    // Check if the place has any of our target types
    const validTypes = ['cafe', 'coffee_shop', 'library', 'lodging'];
    const hasValidType = types.some(type => validTypes.includes(type));
    
    // Explicitly exclude retail and hardware stores
    const excludedTypes = [
      'home_goods_store', 'hardware_store', 'store',
      'general_contractor', 'home_improvement_store', 'department_store',
      'furniture_store', 'electronics_store', 'clothing_store'
    ];
    const hasExcludedType = types.some(type => excludedTypes.includes(type));
    
    console.log(`Place types: ${types.join(', ')} - Valid: ${hasValidType}, Excluded: ${hasExcludedType}`);
    
    return hasValidType && !hasExcludedType;
  };

  const hasWorkReviews = (reviews: any[], placeTypes: string[], placeName?: string) => {
    console.log(`Checking reviews for place: ${reviews.length} total reviews, types: ${placeTypes.join(', ')}`);
    
    // Check if this is a name-based cafe detection (cafe/coffee in the name)
    const isNameBasedCafe = placeName && 
      (placeName.toLowerCase().includes('cafe') || placeName.toLowerCase().includes('coffee'));
    
    // Check for milk tea/boba places in reviews even if not in name
    const hasMilkTeaInReviews = reviews.some(review => {
      const reviewText = review.text?.toLowerCase() || '';
      return reviewText.includes('milk tea') || reviewText.includes('boba') || reviewText.includes('bubble tea');
    });
    
    // For name-based cafes or places with milk tea mentions, only require "wifi" in reviews
    if (isNameBasedCafe || hasMilkTeaInReviews) {
      for (const review of reviews) {
        const reviewText = review.text?.toLowerCase() || '';
        if (reviewText.includes('wifi')) {
          const type = isNameBasedCafe ? 'name-based cafe' : 'milk tea place';
          console.log(`Found wifi mention in ${type} "${placeName}":`, reviewText.slice(0, 100));
          return true;
        }
      }
      const type = isNameBasedCafe ? 'name-based cafe' : 'milk tea place';
      console.log(`${type} "${placeName}" - no wifi mentions found`);
      return false;
    }
    
    // First check if this is a valid place type for non-name-based results
    if (!isValidPlaceType(placeTypes)) {
      console.log('Excluding place - invalid type');
      return false;
    }
    
    // For cafes and coffee shops, be more lenient with keywords
    const isCafeOrCoffeeShop = placeTypes.some(type => 
      type.includes('cafe') || type.includes('coffee_shop') || type.includes('meal_takeaway')
    );
    
    const workKeywords = isCafeOrCoffeeShop 
      ? ['work', 'sit', 'laptop', 'study', 'wifi', 'table', 'seat', 'internet', 'working']
      : ['work', 'sit', 'laptop', 'study', 'wifi'];
    
    for (const review of reviews) {
      const reviewText = review.text?.toLowerCase() || '';
      for (const keyword of workKeywords) {
        if (reviewText.includes(keyword)) {
          console.log(`Found work-related review with keyword "${keyword}":`, reviewText.slice(0, 100));
          return true;
        }
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

      // Check if place is work-friendly based on reviews
      if (!hasWorkReviews(details.reviews || [], details.types || [], place.name)) {
        console.log(`Skipping ${details.name} - no work-related reviews`);
        return null;
      }

      // For hotels, check if they are work-friendly and exclude low-tier hotels
      if (isHotel(details.types || [])) {
        // Exclude low-tier hotels (1-3 star) based on price level or name indicators
        const isLowTierHotel = (
          details.price_level === 1 || 
          details.price_level === 2 ||
          details.price_level === 3 ||
          /\b(motel|inn|budget|economy|motel 6|ramada|extended stay|red roof|super 8|days inn|la quinta|econo lodge)\b/i.test(details.name || '')
        );
        
        if (isLowTierHotel) {
          console.log(`Skipping low-tier hotel ${details.name}`);
          return null;
        }
      }

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
      
      // Format closing time in AM/PM format
      let closingTime = 'Unknown';
      if (todayHours?.close) {
        const hours = Math.floor(todayHours.close.time / 100);
        const minutes = todayHours.close.time % 100;
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        closingTime = `${displayHours}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''} ${period}`;
      }

      // Get best photo for workspace - prioritize interior shots
      const photos = details.photos || [];
      let coverPhoto = `https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop`; // Default: people with laptops
      
      if (photos.length > 0) {
        // Try to find an interior photo by checking multiple photos
        const photoRef = photos.length > 1 ? photos[1].photo_reference : photos[0].photo_reference;
        coverPhoto = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${apiKeys.places}`;
      } else {
        // Use different defaults based on place type
        if (placeType === 'cafe') {
          coverPhoto = `https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=400&h=200&fit=crop`; // Cafe interior
        } else if (placeType === 'library') {
          coverPhoto = `https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=200&fit=crop`; // Library interior
        }
      }

      // Generate work-friendly summary from reviews
      const workFriendlySummary = generateWorkFriendlySummary(details.reviews || [], filters);

      // Remove country from address
      let cleanAddress = details.formatted_address || '';
      if (cleanAddress.includes(', USA') || cleanAddress.includes(', United States')) {
        cleanAddress = cleanAddress.replace(/, USA$/, '').replace(/, United States$/, '');
      }

      return {
        id: place.place_id,
        name: place.name,
        type: placeType,
        rating: parseFloat((place.rating || 0).toFixed(1)),
        reviewCount: place.user_ratings_total || 0,
        isOpen,
        closingTime,
        distance: distance.toFixed(1),
        isWheelchairAccessible: details.wheelchair_accessible_entrance || false,
        description: cleanAddress,
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

  const matchesSelectedFilters = (place: any, details: any) => {
    const reviews = details.reviews || [];
    const allText = reviews.map((r: any) => r.text?.toLowerCase() || '').join(' ');
    const placeName = place.name?.toLowerCase() || '';
    const placeTypes = details.types || [];
    
    // Check each selected filter
    for (const filterId of filters) {
      switch (filterId) {
        case 'pet-friendly':
          const petKeywords = ['dog allowed', 'pet friendly', 'pets allowed', 'dogs welcome', 'cat friendly', 'bring your dog'];
          if (!petKeywords.some(keyword => allText.includes(keyword))) {
            return false;
          }
          break;
          
        case 'quiet':
          // Include all libraries by default
          if (placeTypes.includes('library')) {
            break;
          }
          // Check for quiet mentions
          const quietKeywords = ['quiet', 'peaceful', 'calm', 'silent', 'low noise'];
          const loudKeywords = ['loud', 'noisy', 'very loud here'];
          const quietMentions = quietKeywords.filter(keyword => allText.includes(keyword)).length;
          const loudMentions = loudKeywords.filter(keyword => allText.includes(keyword)).length;
          if (quietMentions === 0 || loudMentions > 1) {
            return false;
          }
          break;
          
        case 'transit':
          // This would require additional API call to check transit stops
          // For now, assume places in dense urban areas meet this criteria
          // You could enhance this with Google Places API transit data
          break;
          
        case 'boba':
          const bobaKeywords = ['boba', 'milk tea', 'bubble tea', 'taiwanese tea', 'pearl tea'];
          if (!placeTypes.includes('cafe') && !placeTypes.includes('coffee_shop')) {
            return false;
          }
          if (!bobaKeywords.some(keyword => allText.includes(keyword) || placeName.includes(keyword))) {
            return false;
          }
          break;
          
        case 'food':
          const foodKeywords = ['food', 'menu', 'sandwich', 'salad', 'restaurant', 'kitchen', 'breakfast', 'lunch', 'dinner'];
          const hasRestaurant = placeTypes.includes('restaurant') || placeTypes.includes('meal_takeaway');
          const isHotelWithFood = placeTypes.includes('lodging') && foodKeywords.some(keyword => allText.includes(keyword));
          const isCafeWithFood = (placeTypes.includes('cafe') || placeTypes.includes('coffee_shop')) && 
                                 foodKeywords.some(keyword => allText.includes(keyword));
          
          if (!hasRestaurant && !isHotelWithFood && !isCafeWithFood) {
            return false;
          }
          break;
          
        case 'late':
          const openingHours = details.opening_hours;
          if (!openingHours) return false;
          
          // Check if open 24 hours
          const is24Hours = openingHours.periods?.some((period: any) => 
            !period.close || (period.open?.time === '0000' && !period.close.time)
          );
          
          if (is24Hours) break;
          
          // Check if open later than 9 PM (21:00)
          const todayPeriod = openingHours.periods?.find((period: any) => 
            period.open?.day === new Date().getDay()
          );
          
          if (!todayPeriod?.close || todayPeriod.close.time < '2100') {
            return false;
          }
          break;
      }
    }
    
    return true;
  };

  const generateWorkFriendlySummary = (reviews: any[], selectedFilters: Set<string>) => {
    const workKeywords = ['wifi', 'laptop', 'work', 'study', 'outlets', 'quiet', 'internet', 'charge', 'cowork'];
    const relevantReviews = reviews.filter(review => 
      workKeywords.some(keyword => 
        review.text?.toLowerCase().includes(keyword)
      )
    ).slice(0, 3);

    if (relevantReviews.length === 0) {
      return '✨ A comfortable space for remote work and productivity.';
    }

    // Generate filter-specific mentions from reviews
    const filterMentions = {
      boba: relevantReviews.some(r => 
        ['boba', 'milk tea', 'bubble tea', 'taiwanese tea', 'matcha latte'].some(keyword => 
          r.text?.toLowerCase().includes(keyword)
        )
      ),
      'pet-friendly': relevantReviews.some(r => 
        ['dog allowed', 'pet friendly', 'pets allowed', 'dogs welcome', 'cat friendly', 'bring your dog'].some(keyword => 
          r.text?.toLowerCase().includes(keyword)
        )
      ),
      quiet: relevantReviews.some(r => r.text?.toLowerCase().includes('quiet')),
      food: relevantReviews.some(r => 
        ['food', 'menu', 'sandwich', 'salad', 'breakfast', 'lunch', 'dinner'].some(keyword => 
          r.text?.toLowerCase().includes(keyword)
        )
      ),
      wifi: relevantReviews.some(r => r.text?.toLowerCase().includes('wifi') || r.text?.toLowerCase().includes('internet')),
      outlets: relevantReviews.some(r => r.text?.toLowerCase().includes('outlet') || r.text?.toLowerCase().includes('charge')),
      late: relevantReviews.some(r => 
        ['open late', 'late night', '24 hour', 'midnight'].some(keyword => 
          r.text?.toLowerCase().includes(keyword)
        )
      )
    };

    let summary = '✨ Reviews mention ';
    const features = [];
    
    // Prioritize features based on selected filters
    for (const filter of selectedFilters) {
      switch (filter) {
        case 'boba':
          if (filterMentions.boba) features.push('excellent milk tea selection');
          break;
        case 'pet-friendly':
          if (filterMentions['pet-friendly']) features.push('pet-friendly environment');
          break;
        case 'quiet':
          if (filterMentions.quiet) features.push('quiet atmosphere');
          break;
        case 'food':
          if (filterMentions.food) features.push('good food options');
          break;
        case 'wifi':
          if (filterMentions.wifi) features.push('reliable WiFi');
          break;
        case 'outlets':
          if (filterMentions.outlets) features.push('charging outlets');
          break;
        case 'late':
          if (filterMentions.late) features.push('late hours');
          break;
      }
    }

    // Add general work features if no filter-specific ones found
    if (features.length === 0) {
      if (filterMentions.wifi) features.push('reliable WiFi');
      if (filterMentions.outlets) features.push('charging outlets');
      if (filterMentions.quiet) features.push('quiet atmosphere');
    }

    if (features.length > 0) {
      summary += `${features.slice(0, 2).join(' and ')} - perfect for remote work.`;
    } else {
      summary += 'a welcoming space that supports productivity and focus.';
    }

    return summary;
  };

  const activeFilterChips = filterChips.filter(chip => filters.has(chip.id));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background Map - 50% of screen on mobile */}
      <div className="h-[50vh] bg-gray-100 relative">
        <SearchResultsMap 
          apiKey={apiKeys.mapsStatic}
          center={mapCenter || userLocation || { lat: 37.7749, lng: -122.4194 }}
          results={searchResults}
        />
        
        {/* Header with Search - Overlay on map */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-background/20 backdrop-blur-sm">
          
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
      </div>

      {/* Results List - Fill remaining space */}
      <div className="flex-1 bg-background">
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 mb-4 min-h-[40px]">
            <div className="flex items-center gap-1 text-sm text-foreground flex-1 min-w-0 md:max-w-[300px]">
              <span className="leading-relaxed">
                {isLoading ? 'Searching...' : `Found ${searchResults.length} work-friendly locations within`}
              </span>
              <Select value={radiusMiles.toString()} onValueChange={(value) => setRadiusMiles(parseInt(value))}>
                <SelectTrigger className="w-16 h-6 px-1 text-sm font-semibold border-0 shadow-none inline-flex" style={{ color: '#3E2098' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="5">5 mi</SelectItem>
                  <SelectItem value="10">10 mi</SelectItem>
                  <SelectItem value="15">15 mi</SelectItem>
                  <SelectItem value="20">20 mi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0 ml-4">
              <Select value={sortBy} onValueChange={(value: 'distance' | 'rating') => setSortBy(value)}>
                <SelectTrigger className="w-32 px-2">
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="distance">Sort by Distance</SelectItem>
                  <SelectItem value="rating">Sort by Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SearchResultsList results={searchResults} userLocation={userLocation} isLoading={isLoading} />
        </div>
      </div>
    </div>
    );
  };