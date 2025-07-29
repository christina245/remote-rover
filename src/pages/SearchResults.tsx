import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Wifi, Zap, Dog, Volume2, CupSoda, Pizza, ClockAlert, Bus, Star, Navigation, Accessibility, ArrowUpDown, Coffee, BookOpen, Hotel, UtensilsCrossed, MapPin as OtherIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

// Yelp API credentials
const YELP_API_KEY = 'Os53shXWu8SJ2nhpjEuWsTCGVoXNLmM_K3R6uyYKT8nfF2LHOZBkOGscGrnOffNdWJCPs6F0zbkN5vD2UimUicEZSmJ7xvOFpDrZenx_WyQwiWKEpAwgc9LUKzqJaHYx';
const YELP_CLIENT_ID = 'r6_S1b2qXbThKVQ4QdU8ww';

// Yelp category mappings
const YELP_CATEGORIES = [
  'coffee', // Coffee & Tea
  'coffeeroasters', // Coffee Roasteries  
  'bakeries', // Bakeries
  'juicebars', // Juice Bars & Smoothies
  'hotels', // Hotels
  'bubbletea', // Bubble tea
  'libraries' // Libraries
];

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
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMapFilters, setActiveMapFilters] = useState(new Set(['cafe', 'library', 'hotel', 'food_court', 'other']));
  
  const RESULTS_PER_PAGE = 10;

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
  }, [searchLocation, filters, userLocation, googleMapsLoaded, radiusMiles]);

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
      console.log(`🔍 Starting search for location: "${searchLocation}"`);
      console.log(`📍 Initial coordinates:`, searchCoords);
      
      if (searchLocation !== 'San Francisco, CA') {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchLocation)}&key=${apiKeys.geocoding}`
        );
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results?.[0]) {
          const { lat, lng } = geocodeData.results[0].geometry.location;
          searchCoords = { lat, lng };
          console.log(`📍 Geocoded coordinates:`, searchCoords);
        }
      }

      // Update map center to show the searched location
      setMapCenter(searchCoords);

      // Initialize Google Places service
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);

      // Search for different place types with comprehensive logging
      const placeTypes = ['cafe', 'coffee_shop', 'library', 'hotel', 'bakery', 'meal_takeaway', 'restaurant'];
      const allResults = [];
      
      console.log(`🎯 Search radius: ${radiusMiles} miles (${radiusMiles * 1609.34} meters)`);

      // Try multiple radii to ensure we don't miss places
      const searchRadii = [radiusMiles, radiusMiles * 1.5, radiusMiles * 2];
      
      for (const currentRadius of searchRadii) {
        console.log(`\n🔄 Searching with radius: ${currentRadius} miles`);
        
        for (const type of placeTypes) {
          const request = {
            location: new google.maps.LatLng(searchCoords.lat, searchCoords.lng),
            radius: currentRadius * 1609.34, // Convert miles to meters
            type: type === 'hotel' ? 'hotel' : type
          };

          const results = await new Promise<any[]>((resolve) => {
            service.nearbySearch(request, (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                console.log(`✅ ${type}: Found ${results?.length || 0} places`);
                // Log place names for debugging
                results?.forEach(place => {
                  if (place.name?.toLowerCase().includes('capital one')) {
                    console.log(`🎯 FOUND CAPITAL ONE: ${place.name} (type: ${type})`);
                  }
                });
                resolve(results || []);
              } else {
                console.log(`❌ ${type}: Search failed with status ${status}`);
                resolve([]);
              }
            });
          });

          allResults.push(...results);
        }

        // Additional search for places with "cafe" or "coffee" in their names
        const nameBasedRequest = {
          location: new google.maps.LatLng(searchCoords.lat, searchCoords.lng),
          radius: currentRadius * 1609.34,
          keyword: 'cafe coffee boba milk tea bubble tea bobaholics'
        };

        const nameBasedResults = await new Promise<any[]>((resolve) => {
          service.nearbySearch(nameBasedRequest, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              console.log(`✅ Keyword search: Found ${results?.length || 0} places`);
              results?.forEach(place => {
                if (place.name?.toLowerCase().includes('capital one')) {
                  console.log(`🎯 FOUND CAPITAL ONE (keyword): ${place.name}`);
                }
              });
              resolve(results || []);
            } else {
              console.log(`❌ Keyword search failed with status ${status}`);
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
        
        // Break early if we found enough results
        if (allResults.length > 50) break;
      }

      // Add comprehensive logging to see what Google returns
      console.log(`\n📊 Search Summary:`);
      console.log(`- Total results before deduplication: ${allResults.length}`);
      console.log(`- Search coordinates: ${searchCoords.lat}, ${searchCoords.lng}`);
      console.log(`- Location: ${searchLocation}`);
      
      // Log all place names to see if Capital One Cafe appears anywhere
      const allPlaceNames = allResults.map(place => place.name).filter(Boolean);
      console.log(`\n📋 All place names found:`, allPlaceNames);
      
      // Specifically look for Capital One in results
      const capitalOneResults = allResults.filter(place => 
        place.name?.toLowerCase().includes('capital one')
      );
      
      if (capitalOneResults.length > 0) {
        console.log(`🎯 Found ${capitalOneResults.length} Capital One locations:`, 
          capitalOneResults.map(p => p.name));
      } else {
        console.log(`❌ No Capital One locations found in any search type`);
        
        // Try an additional broad keyword search for "Capital One"
        console.log(`🔍 Trying broad search for "Capital One"...`);
        
        const broadRequest = {
          location: new google.maps.LatLng(searchCoords.lat, searchCoords.lng),
          radius: radiusMiles * 3 * 1609.34, // Even larger radius
          keyword: 'Capital One'
        };

        const broadResults = await new Promise<any[]>((resolve) => {
          service.nearbySearch(broadRequest, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              console.log(`✅ Broad "Capital One" search: Found ${results?.length || 0} places`);
              results?.forEach(place => {
                console.log(`📍 Broad search found: ${place.name} at distance ${calculateDistance(
                  searchCoords.lat, searchCoords.lng,
                  place.geometry.location.lat(), place.geometry.location.lng()
                ).toFixed(1)} miles`);
              });
              resolve(results || []);
            } else {
              console.log(`❌ Broad "Capital One" search failed with status ${status}`);
              resolve([]);
            }
          });
        });
        
        allResults.push(...broadResults);
      }

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

          if (details) {
            // First check: Is this a name-based cafe? 
            const isNameBasedCafe = place.name && 
              (place.name.toLowerCase().includes('cafe') || place.name.toLowerCase().includes('coffee'));
            
            if (isNameBasedCafe) {
              // Type safety check: Even for name-based cafes, reject inappropriate primary types
              const primaryType = details.types?.[0];
              const primaryRejectedTypes = ['donut_shop', 'gas_station', 'californian_restaurant', 'american_restaurant', 'gift_shop', 'indian_restaurant', 'convenience_store', 'grocery_or_supermarket', 'golf_course', 'country_club'];
              
              if (primaryRejectedTypes.includes(primaryType)) {
                console.log(`✗ Name-based cafe ${place.name} rejected - inappropriate primary type "${primaryType}"`);
                continue;
              }
              
              console.log(`Name-based cafe detected: ${place.name} (primary type: ${primaryType}) - checking wifi and work-friendly criteria`);
              
              // Use simplified work review check for name-based cafes
              if (hasWorkReviews(details.reviews || [], details.types || [], place.name)) {
                const processedPlace = await processPlaceData(place, details, searchCoords);
                if (processedPlace && matchesSelectedFilters(processedPlace, details)) {
                  processedResults.push(processedPlace);
                  console.log(`✓ Added name-based cafe ${place.name} to results`);
                } else {
                  console.log(`Filtered out ${place.name} - doesn't match selected filters`);
                }
              } else {
                console.log(`✗ Filtered out name-based cafe ${place.name} - no work reviews found`);
              }
            } else {
              // Second check: Type validation for non-name-based cafes
              if (!isValidPlaceType(details.types || [])) {
                console.log(`Filtered out ${place.name} - invalid place type. Types: [${(details.types || []).join(', ')}]`);
                continue;
              }
              
              // Third check: Work reviews for type-validated places
              if (details.reviews && hasWorkReviews(details.reviews, details.types || [], place.name)) {
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
            }
          }
        } catch (error) {
          console.error('Error processing place:', error);
        }
      }
      
      console.log(`Final Google results: ${processedResults.length} work-friendly places`);

      // Search Yelp for additional results
      console.log(`\n🔍 Searching Yelp for additional workspaces...`);
      const yelpResults = await searchYelpWorkspaces(searchCoords);
      console.log(`Found ${yelpResults.length} Yelp results`);

      // Combine and deduplicate Google and Yelp results
      const combinedResults = deduplicateResults([...processedResults, ...yelpResults]);
      console.log(`Combined results after deduplication: ${combinedResults.length} places`);

      // Sort results by selected criteria
      const sortedResults = combinedResults.sort((a, b) => {
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

  const searchYelpWorkspaces = async (searchCoords: {lat: number, lng: number}) => {
    try {
      const radius = Math.min(radiusMiles * 1609.34, 40000); // Max 40km radius for Yelp
      const categoriesParam = YELP_CATEGORIES.join(',');
      
      const response = await fetch(
        `https://api.yelp.com/v3/businesses/search?latitude=${searchCoords.lat}&longitude=${searchCoords.lng}&radius=${radius}&categories=${categoriesParam}&limit=50&sort_by=distance`,
        {
          headers: {
            'Authorization': `Bearer ${YELP_API_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        console.error('Yelp API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const businesses = data.businesses || [];
      
      console.log(`Yelp returned ${businesses.length} businesses`);
      
      const processedYelpResults = [];
      
      for (const business of businesses) {
        try {
          // Check if business has required categories
          const hasRequiredCategory = business.categories?.some((cat: any) => 
            YELP_CATEGORIES.some(yelpCat => cat.alias === yelpCat)
          );
          
          if (!hasRequiredCategory) {
            console.log(`Skipping ${business.name} - no required categories`);
            continue;
          }

          // Get business details for reviews
          const detailsResponse = await fetch(
            `https://api.yelp.com/v3/businesses/${business.id}`,
            {
              headers: {
                'Authorization': `Bearer ${YELP_API_KEY}`,
                'Content-Type': 'application/json',
              }
            }
          );

          if (!detailsResponse.ok) continue;
          
          const businessDetails = await detailsResponse.json();
          
          // Get reviews
          const reviewsResponse = await fetch(
            `https://api.yelp.com/v3/businesses/${business.id}/reviews`,
            {
              headers: {
                'Authorization': `Bearer ${YELP_API_KEY}`,
                'Content-Type': 'application/json',
              }
            }
          );

          let reviews = [];
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            reviews = reviewsData.reviews || [];
          }

          // Check for work-friendly reviews using our existing logic
          if (hasYelpWorkReviews(reviews, business.categories || [], business.name)) {
            const processedPlace = normalizeYelpResult(business, businessDetails, reviews, searchCoords);
            if (processedPlace && matchesSelectedFilters(processedPlace, { types: business.categories?.map((c: any) => c.alias) || [] })) {
              processedYelpResults.push(processedPlace);
              console.log(`✓ Added Yelp result: ${business.name}`);
            }
          } else {
            console.log(`✗ Yelp business ${business.name} filtered out - no wifi reviews`);
          }
        } catch (error) {
          console.error(`Error processing Yelp business ${business.name}:`, error);
        }
      }
      
      return processedYelpResults;
    } catch (error) {
      console.error('Error searching Yelp:', error);
      return [];
    }
  };

  const hasYelpWorkReviews = (reviews: any[], categories: any[], placeName: string) => {
    console.log(`\n🔍 Analyzing Yelp business: ${placeName}`);
    
    // Business name analysis for WiFi and work-related terms
    const nameAnalysis = analyzeBusinessName(placeName);
    console.log(`🏪 Business name analysis: ${nameAnalysis.hasWifiTerms ? 'WiFi terms found' : 'No WiFi terms'}, ${nameAnalysis.hasWorkTerms ? 'Work terms found' : 'No work terms'}`);
    
    // If business name has WiFi terms, accept it immediately
    if (nameAnalysis.hasWifiTerms) {
      console.log(`✅ ACCEPTED via business name WiFi terms`);
      return true;
    }
    
    // Check reviews if available
    if (!reviews || reviews.length === 0) {
      console.log(`📝 No reviews available`);
      // If name has work terms but no reviews, still reject (need WiFi confirmation)
      console.log(`❌ REJECTED - no reviews and no WiFi in name`);
      return false;
    }
    
    console.log(`📝 Number of reviews to analyze: ${reviews.length}`);
    
    const workKeywords = [
      'wifi', 'internet', 'laptop', 'work', 'study', 'remote', 'office',
      'productive', 'quiet', 'focus', 'meeting', 'desk', 'table',
      'charging', 'outlet', 'power', 'computer', 'typing'
    ];
    
    let foundKeywords = new Set();
    
    for (const review of reviews) {
      const reviewText = review.text?.toLowerCase() || '';
      console.log(`📖 Review excerpt: "${reviewText.substring(0, 100)}..."`);
      
      for (const keyword of workKeywords) {
        if (reviewText.includes(keyword)) {
          foundKeywords.add(keyword);
          console.log(`✓ Found keyword: "${keyword}"`);
          
          // Special handling for "work" - check context
          if (keyword === 'work') {
            const workContexts = ['work from', 'work on', 'work here', 'work space', 'work environment', 'good for work', 'place to work'];
            const hasGoodWorkContext = workContexts.some(context => reviewText.includes(context));
            const hasBadWorkContext = reviewText.includes('work there') || reviewText.includes('work in') && reviewText.includes('kitchen');
            
            if (hasBadWorkContext && !hasGoodWorkContext) {
              foundKeywords.delete('work');
              console.log(`❌ Removed "work" - bad context detected`);
            }
          }
        }
      }
    }
    
    const hasWifiMention = foundKeywords.has('wifi') || foundKeywords.has('internet');
    const hasWorkEvidence = foundKeywords.size > 0;
    
    console.log(`📊 Keywords found: [${Array.from(foundKeywords).join(', ')}]`);
    console.log(`📶 Has wifi mention: ${hasWifiMention}`);
    console.log(`💼 Has work evidence: ${hasWorkEvidence}`);
    console.log(`✅ Result: ${hasWifiMention ? 'ACCEPTED' : 'REJECTED'} (requires wifi mention)`);
    
    return hasWifiMention; // Only accept if wifi is specifically mentioned
  };

  const analyzeBusinessName = (name: string) => {
    const lowerName = name.toLowerCase();
    
    // WiFi-related terms in business names
    const wifiTerms = [
      'wifi', 'wi-fi', 'internet', 'cyber', 'net cafe', 'netcafe', 'internet cafe'
    ];
    
    // Work-friendly terms in business names  
    const workTerms = [
      'study', 'coworking', 'co-working', 'workspace', 'work space', 
      'office', 'library', 'reading', 'quiet'
    ];
    
    const hasWifiTerms = wifiTerms.some(term => lowerName.includes(term));
    const hasWorkTerms = workTerms.some(term => lowerName.includes(term));
    
    if (hasWifiTerms || hasWorkTerms) {
      console.log(`🏪 Business name "${name}" contains: ${hasWifiTerms ? 'WiFi terms' : ''} ${hasWorkTerms ? 'Work terms' : ''}`);
    }
    
    return { hasWifiTerms, hasWorkTerms };
  };

  const normalizeYelpResult = (business: any, details: any, reviews: any[], searchCoords: {lat: number, lng: number}) => {
    const distance = calculateDistance(
      searchCoords.lat,
      searchCoords.lng,
      business.coordinates.latitude,
      business.coordinates.longitude
    );

    // Use the one photo available on base plan
    const coverPhoto = business.image_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop';
    
    // Determine business type from categories
    let businessType = 'cafe';
    if (business.categories?.some((c: any) => c.alias === 'hotels')) {
      businessType = 'hotel';
    } else if (business.categories?.some((c: any) => c.alias === 'libraries')) {
      businessType = 'library';
    }

    // Format hours
    let isOpen = false;
    let closingTime = 'Unknown';
    if (details.hours?.[0]?.open) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentTime = now.getHours() * 100 + now.getMinutes();
      
      const todayHours = details.hours[0].open.find((h: any) => h.day === currentDay);
      if (todayHours) {
        const openTime = parseInt(todayHours.start);
        const closeTime = parseInt(todayHours.end);
        isOpen = currentTime >= openTime && currentTime <= closeTime;
        closingTime = `${Math.floor(closeTime / 100)}:${(closeTime % 100).toString().padStart(2, '0')}`;
      }
    }

    return {
      id: `yelp_${business.id}`,
      name: business.name,
      type: businessType,
      rating: business.rating || 0,
      reviewCount: business.review_count || 0,
      isOpen,
      closingTime,
      distance: `${distance.toFixed(1)} mi`,
      isWheelchairAccessible: false, // Yelp doesn't provide this info consistently
      description: business.categories?.map((c: any) => c.title).join(', ') || '',
      workFriendlySummary: generateWorkFriendlySummary(reviews, filters),
      coverPhoto,
      source: 'yelp'
    };
  };

  const deduplicateResults = (results: any[]) => {
    const uniqueResults = [];
    const seenPlaces = new Set();
    
    for (const result of results) {
      // Create a key for duplicate detection
      const normalizedName = result.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const distanceNum = parseFloat(result.distance);
      
      // Check for duplicates using name similarity and proximity
      let isDuplicate = false;
      for (const seen of seenPlaces) {
        const [seenName, seenDistance] = (seen as string).split('|');
        const nameSimilarity = normalizedName === seenName;
        const distanceSimilarity = Math.abs(distanceNum - parseFloat(seenDistance)) < 0.1; // Within 0.1 miles
        
        if (nameSimilarity && distanceSimilarity) {
          isDuplicate = true;
          console.log(`🔄 Duplicate detected: ${result.name} (${result.distance}) - skipping`);
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueResults.push(result);
        seenPlaces.add(`${normalizedName}|${distanceNum}`);
      }
    }
    
    return uniqueResults;
  };

  const isHotel = (types: string[]) => {
    return types.some(type => type.includes('lodging'));
  };

  const isValidPlaceType = (types: string[]) => {
    if (!types || types.length === 0) return false;
    
    const primaryType = types[0]; // First type is the primary classification
    const secondaryTypes = types.slice(1);
    
    console.log(`Analyzing types - Primary: "${primaryType}", Secondary: [${secondaryTypes.join(', ')}]`);
    
    // Always accept if primary type is cafe, coffee_shop, library, or lodging
    const primaryAcceptedTypes = ['cafe', 'coffee_shop', 'library', 'lodging', 'food_court'];
    if (primaryAcceptedTypes.includes(primaryType)) {
      console.log(`✓ Accepted - Primary type "${primaryType}" is in accepted list`);
      return true;
    }
    
    // Explicitly reject donut shops, gas stations, convenience stores, golf courses as primary
    const primaryRejectedTypes = ['donut_shop', 'gas_station', 'californian_restaurant', 'american_restaurant', 'gift_shop', 'indian_restaurant', 'convenience_store', 'grocery_or_supermarket', 'golf_course', 'country_club'];
    if (primaryRejectedTypes.includes(primaryType)) {
      console.log(`✗ Rejected - Primary type "${primaryType}" is in rejected list`);
      return false;
    }
    
    // For bakery, meal_takeaway, restaurant as primary - only accept if cafe/coffee_shop is secondary
    // AND passes both name-based and review-based checks (Option 3: Combination Approach)
    const conditionalPrimaryTypes = ['bakery', 'meal_takeaway', 'restaurant'];
    if (conditionalPrimaryTypes.includes(primaryType)) {
      const hasCafeSecondary = secondaryTypes.some(type => 
        type === 'cafe' || type === 'coffee_shop'
      );
      if (hasCafeSecondary) {
        // Store for later enhanced review analysis
        console.log(`⚠️ Conditional check - Primary "${primaryType}" has cafe/coffee_shop secondary, will validate with enhanced checks`);
        return 'conditional'; // Special return value for enhanced validation
      } else {
        console.log(`✗ Rejected - Primary "${primaryType}" lacks cafe/coffee_shop secondary`);
        return false;
      }
    }
    
    // Reject all other primary types
    console.log(`✗ Rejected - Primary type "${primaryType}" not in any accepted category`);
    return false;
  };

  const hasWorkReviews = (reviews: any[], placeTypes: string[], placeName?: string) => {
    console.log(`Checking reviews for place: ${reviews.length} total reviews, types: ${placeTypes.join(', ')}`);
    
    // Note: Name-based cafe detection is now handled upstream, so this function
    // only processes places that have already passed type validation
    
    // Check for milk tea/boba places in reviews even if not in name
    const hasMilkTeaInReviews = reviews.some(review => {
      const reviewText = review.text?.toLowerCase() || '';
      return reviewText.includes('milk tea') || reviewText.includes('boba') || reviewText.includes('bubble tea');
    });
    
    // For places with milk tea mentions, only require "wifi" in reviews
    if (hasMilkTeaInReviews) {
      for (const review of reviews) {
        const reviewText = review.text?.toLowerCase() || '';
        if (reviewText.includes('wifi')) {
          console.log(`Found wifi mention in milk tea place "${placeName}":`, reviewText.slice(0, 100));
          return true;
        }
      }
      console.log(`Milk tea place "${placeName}" - no wifi mentions found`);
      return false;
    }
    
    // Handle conditional places (restaurants with cafe secondary) - Option 3: Combination Approach
    const placeTypeResult = isValidPlaceType(placeTypes);
    if (placeTypeResult === 'conditional') {
      console.log(`Applying Option 3 enhanced validation for "${placeName}"`);
      
      // 1. Name-based filtering: Check if name contains legitimate cafe/coffee terms
      const validCafeNames = ['coffee', 'cafe', 'espresso', 'latte', 'brew', 'roast', 'bean', 'grind'];
      const nameHasCafeTerms = placeName && validCafeNames.some(term => 
        placeName.toLowerCase().includes(term)
      );
      
      if (!nameHasCafeTerms) {
        console.log(`✗ Conditional rejection - "${placeName}" name doesn't contain legitimate cafe terms`);
        return false;
      }
      
      // 2. Enhanced review analysis: Require stronger work-friendly evidence
      const strongWorkKeywords = ['laptop', 'study', 'work from here', 'wifi', 'quiet place to work', 'working on laptop', 'work space', 'good for studying'];
      const hasStrongWorkEvidence = reviews.some(review => {
        const reviewText = review.text?.toLowerCase() || '';
        return strongWorkKeywords.some(keyword => reviewText.includes(keyword));
      });
      
      if (!hasStrongWorkEvidence) {
        console.log(`✗ Conditional rejection - "${placeName}" lacks strong work-friendly evidence in reviews`);
        return false;
      }
      
      console.log(`✓ Conditional acceptance - "${placeName}" passed both name and review checks`);
      // Continue with normal validation below
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
          // For "work" keyword, check context to avoid false positives
          if (keyword === 'work') {
            const workContext = [
              'work from', 'good for work', 'place to work', 'work here',
              'working on', 'work laptop', 'work space', 'work friendly',
              'remote work', 'work area', 'work environment', 'great place to work'
            ];
            const hasWorkContext = workContext.some(context => reviewText.includes(context));
            if (!hasWorkContext) {
              // Check if "work" appears in wrong context (like "doesn't work", "hard work", etc.)
              const badWorkContext = [
                "doesn't work", "don't work", "not work", "hard work", 
                "work here" // as in employment
              ];
              const hasBadContext = badWorkContext.some(context => reviewText.includes(context));
              if (hasBadContext) {
                console.log(`Skipping "work" keyword - found in bad context: ${reviewText.slice(0, 100)}`);
                continue;
              }
            }
          }
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
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKeys.places,
            'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,currentOpeningHours,photos,editorialSummary,reviews,types,accessibilityOptions'
          }
        }
      );
      const data = await response.json();
      
      // Transform new API response to match legacy format for compatibility
      if (data) {
        return {
          result: {
            name: data.displayName?.text || '',
            rating: data.rating || 0,
            user_ratings_total: data.userRatingCount || 0,
            opening_hours: data.currentOpeningHours ? {
              open_now: data.currentOpeningHours.openNow,
              periods: data.currentOpeningHours.periods
            } : null,
            photos: data.photos || [],
            editorial_summary: data.editorialSummary,
            reviews: data.reviews || [],
            types: data.types || [],
            wheelchair_accessible_entrance: data.accessibilityOptions?.wheelchairAccessibleEntrance
          }
        };
      }
      return null;
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
        // Log hotel details for debugging
        console.log(`Processing hotel: ${details.name}, price_level: ${details.price_level}`);
        
        // Exclude low-tier hotels (0-3 star) based on explicit price level or name indicators
        const isLowTierHotel = (
          details.price_level === 0 ||
          details.price_level === 1 || 
          details.price_level === 2 ||
          details.price_level === 3 ||
          /\b(motel|inn|budget|economy|motel 6|hotel elan|courtyard by marriott|the arena|ramada|extended stay|red roof|super 8|days inn|la quinta|econo lodge)\b/i.test(details.name || '')
        );
        
        if (isLowTierHotel) {
          console.log(`Excluding hotel: ${details.name}, reason: price_level ${details.price_level} or budget name pattern`);
          return null;
        }
        
        console.log(`Including hotel: ${details.name}, price_level: ${details.price_level}`);
      }

      // Determine place type
      const types = details.types || [];
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
        // Get photo using proper API v1 media endpoint with headers
        try {
          const photoName = photos.length > 1 ? photos[1].name : photos[0].name;
          const photoResponse = await fetch(
            `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400`,
            {
              headers: {
                'X-Goog-Api-Key': apiKeys.places
              }
            }
          );
          if (photoResponse.ok) {
            coverPhoto = photoResponse.url;
          }
        } catch (error) {
          console.error('Error loading photo:', error);
        }
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
    
    // Handle both Google and Yelp data structures
    let placeTypes = details.types || [];
    if (place.source === 'yelp' && details.types && Array.isArray(details.types)) {
      // For Yelp, types are category aliases
      placeTypes = details.types;
    }
    
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

  // Filter results based on map filters
  const filteredResults = searchResults.filter(result => {
    if (result.type === 'cafe') return activeMapFilters.has('cafe');
    if (result.type === 'library') return activeMapFilters.has('library');
    if (result.type === 'hotel') return activeMapFilters.has('hotel');
    if (result.type === 'food_court') return activeMapFilters.has('food_court');
    return activeMapFilters.has('other');
  });

  // Filter map results for display
  const filteredMapResults = searchResults.filter(result => {
    if (result.type === 'cafe') return activeMapFilters.has('cafe');
    if (result.type === 'library') return activeMapFilters.has('library');
    if (result.type === 'hotel') return activeMapFilters.has('hotel');
    if (result.type === 'food_court') return activeMapFilters.has('food_court');
    return activeMapFilters.has('other');
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + RESULTS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMapFilters, searchResults]);

  const toggleMapFilter = (filterType: string) => {
    const newFilters = new Set(activeMapFilters);
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType);
    } else {
      newFilters.add(filterType);
    }
    setActiveMapFilters(newFilters);
  };

  const mapFilterButtons = [
    { id: 'cafe', label: 'Cafes', icon: Coffee },
    { id: 'library', label: 'Libraries', icon: BookOpen },
    { id: 'hotel', label: 'Hotels', icon: Hotel },
    { id: 'food_court', label: 'Food Courts', icon: UtensilsCrossed },
    { id: 'other', label: 'Other', icon: OtherIcon }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Results Panel */}
      <div className="w-full md:w-[35%] flex flex-col bg-background border-r h-screen">
        {/* Search Bar - Fixed */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10" size={20} />
            <Input
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by city or ZIP"
              className="w-full pl-10 pr-12 h-12 rounded-3xl border-0 shadow-inner bg-background focus-visible:ring-0"
              style={{ 
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
                maxWidth: window.innerWidth < 768 ? '85%' : '100%'
              }}
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              🔍
            </button>
          </div>

          {/* Selected Filter Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
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

        {/* Controls - Fixed */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-sm text-foreground flex-1">
              <span>
                {isLoading ? 'Searching...' : `Found ${filteredResults.length} locations within`}
              </span>
              <Select value={radiusMiles.toString()} onValueChange={(value) => setRadiusMiles(parseInt(value))}>
                <SelectTrigger className="w-16 h-6 px-1 text-sm font-semibold border-0 shadow-none" style={{ color: '#3E2098' }}>
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

        {/* Results List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <SearchResultsList results={paginatedResults} userLocation={userLocation} isLoading={isLoading} />
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 p-0"
                >
                  <ChevronLeft size={16} />
                </Button>
                
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 p-0"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Map - Fixed */}
      <div className="hidden md:flex md:flex-1 relative h-screen">
        <SearchResultsMap 
          apiKey={apiKeys.mapsStatic}
          center={mapCenter || userLocation || { lat: 37.7749, lng: -122.4194 }}
          results={filteredMapResults}
          activeFilters={activeMapFilters}
        />
        
        {/* Map Filter Buttons */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-xs items-center">
          <span className="text-black font-bold text-xl" style={{ textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white' }}>
            Showing:
          </span>
          {mapFilterButtons.map((button) => {
            const IconComponent = button.icon;
            const isActive = activeMapFilters.has(button.id);
            return (
              <Button
                key={button.id}
                variant="outline"
                size="sm"
                onClick={() => toggleMapFilter(button.id)}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isActive 
                    ? 'text-white border-transparent' 
                    : 'text-black border-none'
                }`}
                style={{ 
                  backgroundColor: isActive ? '#3E2098' : '#EDE8F5'
                }}
              >
                <IconComponent size={14} />
                {button.label}
              </Button>
            );
          })}
        </div>

        {/* Map Legend */}
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Cafes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Libraries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Hotels</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Food Courts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EDE8F5' }}></div>
              <span>Other</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };