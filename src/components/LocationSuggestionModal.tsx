import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface LocationSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationSuggestionModal: React.FC<LocationSuggestionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    locationName: '',
    address: '',
    description: '',
    googleMapsUrl: '',
    email: '',
    additionalNotes: '',
    isLaptopFriendly: false,
    hasOutlets: false,
    hasStrongWifi: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = formData.locationName.trim() && 
                     formData.address.trim() && 
                     formData.description.trim() &&
                     formData.googleMapsUrl.trim() &&
                     formData.email.trim() &&
                     formData.isLaptopFriendly &&
                     formData.hasOutlets &&
                     formData.hasStrongWifi;

  const handleSubmit = () => {
    if (isFormValid) {
      console.log('Submitting location suggestion:', formData);
      // Handle form submission here
      setFormData({ 
        locationName: '', 
        address: '', 
        description: '',
        googleMapsUrl: '',
        email: '',
        additionalNotes: '',
        isLaptopFriendly: false,
        hasOutlets: false,
        hasStrongWifi: false,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[80%] max-w-md mx-auto">
        <DialogHeader className="relative">
          <DialogTitle className="text-lg font-semibold text-center pr-8">
            Suggest a Location
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-0 top-0 h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <p className="text-sm text-gray-600">
            Know of another place that should be featured in these results but isn't? Send 
            its Google Maps URL over our way!
          </p>
          
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              But first, confirm this location is: *
            </Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="laptop-friendly"
                  checked={formData.isLaptopFriendly}
                  onCheckedChange={(checked) => handleInputChange('isLaptopFriendly', checked)}
                />
                <Label htmlFor="laptop-friendly" className="text-sm">
                  💻 Laptop-friendly
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-outlets"
                  checked={formData.hasOutlets}
                  onCheckedChange={(checked) => handleInputChange('hasOutlets', checked)}
                />
                <Label htmlFor="has-outlets" className="text-sm">
                  🔌 Has outlets
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="strong-wifi"
                  checked={formData.hasStrongWifi}
                  onCheckedChange={(checked) => handleInputChange('hasStrongWifi', checked)}
                />
                <Label htmlFor="strong-wifi" className="text-sm">
                  📶 Has strong wi-fi
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl" className="text-sm font-medium">
              Google Maps URL: *
            </Label>
            <Input
              id="googleMapsUrl"
              placeholder="https://maps.google.com/..."
              value={formData.googleMapsUrl}
              onChange={(e) => handleInputChange('googleMapsUrl', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Your email: *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes" className="text-sm font-medium">
              Additional notes (optional):
            </Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional information about this location..."
              value={formData.additionalNotes}
              onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
              className="w-full min-h-[60px] resize-none"
            />
          </div>

          {!isFormValid && (
            <p className="text-sm text-red-500 text-center">
              All fields required.
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`w-full mt-6 ${
              isFormValid 
                ? 'bg-[#3E2098] hover:bg-[#3E2098]/90 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Submit feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};