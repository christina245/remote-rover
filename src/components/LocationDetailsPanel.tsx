import React, { useState } from 'react';
import { X, Star, Navigation, Accessibility, MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from './FeedbackModal';

interface LocationDetails {
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
  address?: string;
  googleMapsUrl?: string;
  yelpUrl?: string;
  hasGoogleMapsVersion?: boolean;
  dataSource?: 'yelp' | 'google_maps';
  reviews?: Array<{
    id: string;
    text: string;
    author: string;
    rating: number;
  }>;
  photos?: string[];
}

interface LocationDetailsPanelProps {
  location: LocationDetails;
  onClose: () => void;
  className?: string;
}

export const LocationDetailsPanel: React.FC<LocationDetailsPanelProps> = ({
  location,
  onClose,
  className
}) => {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Highlight work and wifi keywords in review text
  const highlightKeywords = (text: string) => {
    const keywords = ['work', 'wifi', 'wi-fi', 'internet', 'laptop', 'remote'];
    let highlightedText = text;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, 
        `<span style="background-color: #EDE8F5; padding: 1px 2px; border-radius: 2px;">$&</span>`
      );
    });
    
    return highlightedText;
  };

  // Mock reviews for demonstration - in real app, these would come from API
  const mockReviews = [
    {
      id: '1',
      text: 'Great place to work remotely! The wifi is super fast and there are plenty of outlets. Perfect for getting work done.',
      author: 'John D.',
      rating: 5
    },
    {
      id: '2', 
      text: 'Love coming here to work on my laptop. The wifi never fails and the atmosphere is perfect for productivity.',
      author: 'Sarah M.',
      rating: 4
    },
    {
      id: '3',
      text: 'Excellent wifi connection and lots of seating for remote work. The staff is very accommodating to people who work here.',
      author: 'Mike R.',
      rating: 5
    }
  ];

  const relevantReviews = location.reviews || mockReviews.slice(0, 3);

  return (
    <>
      <div 
        className={cn("bg-background border-l shadow-lg overflow-y-auto w-full h-full", className)}
        style={{ 
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain'
        }}
        tabIndex={0}
        onMouseEnter={(e) => e.currentTarget.focus()}
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-end justify-end z-10">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Cover Photo */}
          <div className="h-48 bg-gray-200 rounded-lg overflow-hidden">
            <img 
              src={location.coverPhoto} 
              alt={location.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const fallbackImages = {
                  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
                  library: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
                  hotel: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop'
                };
                e.currentTarget.src = fallbackImages[location.type as keyof typeof fallbackImages] || fallbackImages.cafe;
              }}
            />
          </div>

          {/* Location Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-xl">{location.name}</h3>
                <p className="text-muted-foreground capitalize">{location.type}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{location.rating === 4 ? '4.0' : location.rating}</span>
                <span className="text-muted-foreground">({location.reviewCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {location.type === 'hotel' ? (
                <span className="font-medium text-green-600">Open 24 hours</span>
              ) : (
                <>
                  <span className={cn(
                    "font-medium",
                    location.isOpen ? "text-green-600" : "text-[#AC080B]"
                  )}>
                    {location.isOpen ? 'Open' : 'Closed'}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {location.isOpen ? 'Closes' : 'Closed'} at {location.closingTime}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Navigation size={14} />
              <span>{location.distance} miles</span>
            </div>

            {location.address && (
              <div className="text-sm text-muted-foreground">
                {location.address}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-sm" style={{ color: '#9292B9' }}>
              {location.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {location.workFriendlySummary}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-5">
            <div className="w-3/5 max-w-[60%] md:max-w-[40%]">
              {(location.dataSource === 'google_maps' || location.hasGoogleMapsVersion) && (
                <Button 
                  className="w-full bg-[#3E2098] hover:bg-[#3E2098]/90 text-white"
                  onClick={() => {
                    const placeName = encodeURIComponent(location.name);
                    const address = encodeURIComponent(location.address || '');
                    const url = location.googleMapsUrl || `https://www.google.com/maps/search/${placeName}+${address}`;
                    window.open(url, '_blank');
                  }}
                >
                  <img src="/lovable-uploads/dfe2b59f-1efb-4e0a-934f-a18e7e504cda.png" alt="Google Maps" className="w-3.2 h-5" />
                  <span className="ml-1">Open in Google Maps</span>
                </Button>
              )}
              
              {location.dataSource === 'yelp' && !location.hasGoogleMapsVersion && (
                <Button 
                  className="w-full bg-[#3E2098] hover:bg-[#3E2098]/90 text-white"
                  onClick={() => window.open(location.yelpUrl || '#', '_blank')}
                >
                  <img src="/lovable-uploads/a66347bb-d90b-41b5-b279-92ad86632567.png" alt="Yelp" className="w-4 h-5 mr-2" />
                  Open in Yelp
                  <ExternalLink size={16} className="ml-2" />
                </Button>
              )}
            </div>
            
            {/* Send Feedback Link */}
            <div className="text-center">
              <button 
                onClick={() => setFeedbackModalOpen(true)}
                className="text-[#3E2098] hover:underline font-medium"
              >
                Send feedback
              </button>
            </div>
          </div>

          {/* Photo Placeholders */}
          <div className="space-y-3">
            <h4 className="font-medium">Photos</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-square bg-[#D9D9D9] rounded-lg"></div>
              <div className="aspect-square bg-[#D9D9D9] rounded-lg"></div>
            </div>
          </div>

          {/* Work-Related Reviews */}
          {relevantReviews.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Reviews mentioning remote work & wifi</h4>
              <div className="space-y-4">
                {relevantReviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{review.author}</span>
                    </div>
                    <p 
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: highlightKeywords(review.text) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {feedbackModalOpen && (
        <FeedbackModal 
          locationName={location.name}
          onClose={() => setFeedbackModalOpen(false)}
        />
      )}
    </>
  );
};