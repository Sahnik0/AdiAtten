import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
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

interface ReportIssueProps {
  classId?: string;
}

const ReportIssue: React.FC<ReportIssueProps> = ({ classId }) => {
  const [open, setOpen] = useState(false);
  const [issueDetails, setIssueDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classAdmin, setClassAdmin] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Use the provided classId or fetch the student's enrolled class
  useEffect(() => {
    const fetchClassInfo = async () => {
      if (!currentUser || currentUser.isAdmin) return;

      // If classId is provided directly, use it
      if (classId) {
        setSelectedClassId(classId);
        
        // Get the admin of this class
        try {
          const classDoc = await getDoc(doc(firestore, 'classes', classId));
          
          if (classDoc.exists()) {
            const classData = classDoc.data();
            setClassAdmin(classData.createdBy);
          }
        } catch (error) {
          console.error("Error fetching class admin:", error);
        }
        return;
      }

      // Otherwise try to find enrolled class from classes collection
      try {
        const classesQuery = query(
          collection(firestore, 'classes'),
          where('students', 'array-contains', currentUser.uid)
        );
        const classesSnapshot = await getDocs(classesQuery);
        
        if (!classesSnapshot.empty) {
          const classData = classesSnapshot.docs[0].data();
          setSelectedClassId(classesSnapshot.docs[0].id);
          setClassAdmin(classData.createdBy);
        }
      } catch (error) {
        console.error("Error fetching enrolled class:", error);
      }
    };

    fetchClassInfo();
  }, [currentUser, classId]);

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

    if (!selectedClassId) {
      toast({
        title: "Error",
        description: "You must be enrolled in a class to submit a report.",
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
        classId: selectedClassId,
        sessionId: null
      });
      
      toast({
        title: "Report Submitted",
        description: "Your issue has been reported to the class administrator.",
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

  if (!selectedClassId && !currentUser?.isAdmin) {
    return (
      <Button variant="outline" className="flex items-center gap-2" disabled>
        <AlertTriangle className="h-4 w-4" />
        Join a Class to Report Issues
      </Button>
    );
  }

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