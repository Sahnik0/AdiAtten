
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

const ReportIssue = () => {
  const [open, setOpen] = useState(false);
  const [issueDetails, setIssueDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!issueDetails.trim()) {
      toast({
        title: "Error",
        description: "Please provide details about the issue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await addDoc(collection(firestore, 'reports'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0],
        userEmail: currentUser.email,
        rollNumber: currentUser.rollNumber,
        issueDetails,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      
      toast({
        title: "Report Submitted",
        description: "Your issue has been reported to the administrators.",
      });
      
      setIssueDetails('');
      setOpen(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error",
        description: "Failed to submit your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Report an Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Describe any issue you're experiencing with the attendance system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder="Please provide details about the issue you're experiencing..."
            className="min-h-[120px]"
            value={issueDetails}
            onChange={(e) => setIssueDetails(e.target.value)}
          />
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !issueDetails.trim()}
            className="ml-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssue;