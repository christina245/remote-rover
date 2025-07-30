import React from 'react';
import { Star, Navigation, Accessibility } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationSuggestionBanner } from './LocationSuggestionBanner';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  closingTime: string;
  distance: string;
  isWheelchairAccessible: boolean;
  description: string;
  workFriendlySummary: string;
  coverPhoto: string;
}

interface SearchResultsListProps {
  results: SearchResult[];
  userLocation: { lat: number; lng: number } | null;
  isLoading?: boolean;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({ 
  results, 
  userLocation,
  isLoading = false
}) => {
  if (results.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No workspaces found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <LocationSuggestionBanner />
      {results.map((result) => (
        <div key={result.id} className="bg-background border rounded-lg overflow-hidden shadow-sm">
          {/* Cover Photo */}
          <div className="h-32 bg-gray-200 relative overflow-hidden">
            <img 
              src={result.coverPhoto} 
              alt={result.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to interior/workspace photos based on place type
                const fallbackImages = {
                  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop', // Cafe interior with people working
                  library: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop', // Library interior
                  hotel: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=200&fit=crop' // Hotel lobby/workspace
                };
                e.currentTarget.src = fallbackImages[result.type as keyof typeof fallbackImages] || fallbackImages.cafe;
              }}
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="text-xs bg-background px-2 py-1 rounded flex items-center gap-1">
                <Navigation size={12} />
                {result.distance}
              </span>
              {result.isWheelchairAccessible && (
                <span className="text-xs bg-background px-2 py-1 rounded">
                  <Accessibility size={12} />
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{result.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{result.type}</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{result.rating}</span>
                <span className="text-muted-foreground">({result.reviewCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3 text-sm">
              {result.type === 'hotel' ? (
                <span className="font-medium text-green-600">
                  Open 24 hours
                </span>
              ) : (
                <>
                  <span className={cn(
                    "font-medium",
                    result.isOpen ? "text-green-600" : "text-[#AC080B]"
                  )}>
                    {result.isOpen ? 'Open' : 'Closed'}
                  </span>
                  {result.isOpen && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        Closes at {result.closingTime}
                      </span>
                    </>
                  )}
                  {!result.isOpen && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        Closes at {result.closingTime}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Google Maps Description */}
            <p className="text-sm mb-3" style={{ color: '#9292B9' }}>
              {result.description}
            </p>

            {/* AI-Generated Work-Friendly Summary */}
            <p className="text-sm text-muted-foreground">
              {result.workFriendlySummary}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};