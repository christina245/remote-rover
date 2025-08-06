import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Zap, Dog, Volume2, CupSoda, Pizza, ClockAlert, Bus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
// Using uploaded logo directly from Lovable
const remoteRoverLogo = '/lovable-uploads/851bb79d-eedc-4b82-a6f1-733ef4e3ee10.png';

interface FilterChip {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultSelected?: boolean;
}

const filterChips: FilterChip[] = [
  { id: 'wifi', label: 'Wifi', icon: <Wifi size={16} />, defaultSelected: true },
  { id: 'outlets', label: 'Outlets', icon: <Zap size={16} />, defaultSelected: true },
  { id: 'pet-friendly', label: 'Pet-friendly', icon: <Dog size={16} /> },
  { id: 'quiet', label: 'Quiet area', icon: <Volume2 size={16} /> },
  { id: 'transit', label: 'Near public transit', icon: <Bus size={16} /> },
  { id: 'boba', label: 'Has boba', icon: <CupSoda size={16} /> },
  { id: 'food', label: 'Has food', icon: <Pizza size={16} /> },
  { id: 'late', label: 'Open late', icon: <ClockAlert size={16} /> },
];

interface LocationSearchProps {
  apiKeys: {
    geocoding: string;
    geolocation: string;
    mapsStatic: string;
    places: string;
  };
}

export const LocationSearch: React.FC<LocationSearchProps> = ({ apiKeys }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(filterChips.filter(chip => chip.defaultSelected).map(chip => chip.id))
  );
  const [mapBackground, setMapBackground] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsLoadingLocation(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await geocodePosition(latitude, longitude);
            generateMapBackground(latitude, longitude);
          },
          () => {
            // Default to San Francisco if location is denied
            setLocation('San Francisco, CA');
            generateMapBackground(37.7749, -122.4194); // SF coordinates
          }
        );
      } else {
        setLocation('San Francisco, CA');
        generateMapBackground(37.7749, -122.4194);
      }
    } catch (error) {
      setLocation('San Francisco, CA');
      generateMapBackground(37.7749, -122.4194);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const geocodePosition = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKeys.geocoding}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        const addressComponents = data.results[0].address_components;
        const city = addressComponents.find((comp: any) => 
          comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
        )?.long_name;
        const state = addressComponents.find((comp: any) => 
          comp.types.includes('administrative_area_level_1')
        )?.short_name;
        const zipCode = addressComponents.find((comp: any) => 
          comp.types.includes('postal_code')
        )?.long_name;
        
        setLocation(`${city}, ${state} ${zipCode || ''}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const generateMapBackground = (lat: number, lng: number) => {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=12&size=400x300&maptype=roadmap&key=${apiKeys.mapsStatic}`;
    setMapBackground(mapUrl);
  };

  const toggleFilter = (filterId: string) => {
    const newSelected = new Set(selectedFilters);
    if (newSelected.has(filterId)) {
      newSelected.delete(filterId);
    } else {
      newSelected.add(filterId);
    }
    setSelectedFilters(newSelected);
  };

  const handleSearch = () => {
    if (location.trim()) {
      const params = new URLSearchParams({
        location: location.trim(),
        filters: Array.from(selectedFilters).join(',')
      });
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Google Maps Background */}
      {mapBackground && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{
            backgroundImage: `url(${mapBackground})`,
          }}
        />
      )}
      
      {/* Main Content */}
      <div className="relative z-10 p-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-5 mt-7">
          <img 
            src={remoteRoverLogo} 
            alt="Remote Rover" 
            className="h-11 w-auto md:h-28"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-base md:text-5xl font-bold text-black mb-2 font-ibm-plex leading-none">
            Find your next public remote workspace.
          </h1>
         <center><p className="text-muted-foreground text-sm md:text-base max-w-sm md:max-w-2xl">
            Enjoy a new environment every day while getting work done. Remote Rover searches local cafes, hotels, libraries, and more to find free spaces suited for remote work.
          </p></center>
        </div>

        {/* Search Bar Container */}
        <div className="relative w-[85%] md:w-[50%] mb-4">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10" size={20} />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by city or ZIP"
            className="w-full pl-10 pr-12 h-12 bg-background border border-gray-300 rounded-full shadow-inner focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            disabled={isLoadingLocation}
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoadingLocation}
          >
            <Search size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Filter Label */}
        <p className="text-foreground font-medium mb-4 text-sm">I'm looking for:</p>

        {/* Filter Chips */}
        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => toggleFilter(chip.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                selectedFilters.has(chip.id)
                  ? "text-white"
                  : "text-foreground"
              )}
              style={{
                backgroundColor: selectedFilters.has(chip.id) ? '#3E2098' : '#EDE8F5'
              }}
            >
              {chip.icon}
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};