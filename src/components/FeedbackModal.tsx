import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface FeedbackModalProps {
  locationName: string;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  locationName,
  onClose
}) => {
  const [email, setEmail] = useState('');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [otherFeedback, setOtherFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackOptions = [
    { id: 'not-laptop-friendly', label: 'Not laptop-friendly', icon: '✕' },
    { id: 'no-outlets', label: 'No outlets', icon: '🔌' },
    { id: 'weak-wifi', label: 'Weak Wi-Fi', icon: '📶' },
    { id: 'too-noisy', label: 'Too noisy', icon: '🔊' },
    { id: 'laptop-time-limit', label: 'Laptop time limit enforced', icon: '⏰' },
    { id: 'no-seating', label: 'No seating available', icon: '🪑' },
    { id: 'no-working', label: "Doesn't allow working", icon: '🚫' },
    { id: 'bad-vibe', label: 'Vibe not right for remote work', icon: '✨' }
  ];

  const handleIssueToggle = (issueId: string) => {
    setSelectedIssues(prev =>
      prev.includes(issueId)
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // In a real app, this would send the feedback to an API
    console.log('Feedback submitted:', {
      locationName,
      email,
      selectedIssues,
      otherFeedback
    });
    
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Thank you!</h3>
          <p className="text-muted-foreground">
            ✅ Thank you for submitting your feedback! Your request will be reviewed shortly.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Send feedback</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Should this result not be featured? Let us know and why!
            </p>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Feedback Options */}
          <div className="space-y-3">
            {feedbackOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3">
                <Checkbox
                  id={option.id}
                  checked={selectedIssues.includes(option.id)}
                  onCheckedChange={() => handleIssueToggle(option.id)}
                />
                <label
                  htmlFor={option.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  <span>{option.icon}</span>
                  {option.label}
                </label>
              </div>
            ))}
          </div>

          {/* Other Feedback */}
          <div className="space-y-2">
            <Label htmlFor="other-feedback">Other</Label>
            <Textarea
              id="other-feedback"
              value={otherFeedback}
              onChange={(e) => setOtherFeedback(e.target.value)}
              placeholder="Additional feedback..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#3E2098] hover:bg-[#3E2098]/90"
            disabled={!email.trim()}
          >
            Submit feedback
          </Button>
        </form>
      </div>
    </div>
  );
};
