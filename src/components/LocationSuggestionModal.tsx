import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = formData.locationName.trim() && 
                     formData.address.trim() && 
                     formData.description.trim();

  const handleSubmit = () => {
    if (isFormValid) {
      console.log('Submitting location suggestion:', formData);
      // Handle form submission here
      setFormData({ locationName: '', address: '', description: '' });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[80%] max-w-none mx-auto">
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
          <div className="space-y-2">
            <Label htmlFor="locationName" className="text-sm font-medium">
              Location Name *
            </Label>
            <Input
              id="locationName"
              placeholder="Enter location name"
              value={formData.locationName}
              onChange={(e) => handleInputChange('locationName', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address *
            </Label>
            <Input
              id="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Why should this location be included? (e.g., great WiFi, quiet atmosphere, work-friendly)"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full min-h-[80px] resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`w-full mt-6 ${
              isFormValid 
                ? 'bg-[#3E2098] hover:bg-[#3E2098]/90 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Submit Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};