
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { firestore, database } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, AlertTriangle, Check, Clock } from 'lucide-react';
import { Class } from '@/lib/types';

interface AttendanceFormProps {
  selectedClass: Class | null;
}

const AttendanceForm = ({ selectedClass }: AttendanceFormProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { 
    currentLocation, 
    loading: locationLoading, 
    error: locationError, 
    isWithinCampus, 
    checkLocation, 
    distance, 
    maxAllowedDistance 
  } = useGeolocation();
  
  const [submitting, setSubmitting] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  // Check if attendance has already been marked today for the selected class
  useEffect(() => {
    const checkAttendanceStatus = async () => {
      if (!currentUser || !selectedClass) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendanceId = `${currentUser.uid}_${today}_${selectedClass.id}`;
        
        const attendanceRef = doc(firestore, 'attendance', attendanceId);
        const attendanceDoc = await getDoc(attendanceRef);
        
        if (attendanceDoc.exists()) {
          setAttendanceMarked(true);
        } else {
          setAttendanceMarked(false);
        }
      } catch (error) {
        console.error("Error checking attendance status:", error);
      }
    };
    
    checkAttendanceStatus();
  }, [currentUser, selectedClass]);

  const handleMarkAttendance = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to mark attendance.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select an active class to mark attendance.",
        variant: "destructive",
      });
      return;
    }

    if (!currentLocation) {
      toast({
        title: "Error",
        description: "Unable to get your location. Please enable location services.",
        variant: "destructive",
      });
      return;
    }

    if (!isWithinCampus) {
      toast({
        title: "Location Error",
        description: `You must be within ${maxAllowedDistance}m of the campus boundary to mark attendance.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceId = `${currentUser.uid}_${today}_${selectedClass.id}`;

      // Add to Firestore attendance collection
      await setDoc(doc(firestore, 'attendance', attendanceId), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        rollNumber: currentUser.rollNumber || '',
        timestamp: serverTimestamp(),
        date: today,
        verified: false,
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy
        },
        classId: selectedClass.id
      });

      // Add to Realtime Database pending attendance
      await set(ref(database, `attendancePending/${selectedClass.id}/${currentUser.uid}`), {
        email: currentUser.email,
        name: currentUser.displayName || currentUser.email?.split('@')[0],
        rollNumber: currentUser.rollNumber || '',
        timestamp: Date.now(),
        date: today,
        classId: selectedClass.id
      });

      setAttendanceMarked(true);
      toast({
        title: "Success",
        description: "Your attendance has been submitted for verification.",
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (attendanceMarked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center">
            <Check className="mr-2" /> Attendance Submitted
          </CardTitle>
          <CardDescription>Your attendance has been submitted and is pending verification by admin.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            onClick={() => setAttendanceMarked(false)}
            variant="outline"
          >
            Mark Another Attendance
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
        <CardDescription>
          Mark your attendance for {selectedClass ? selectedClass.name : 'your class'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Status */}
        <div className={`p-4 rounded-md ${
          isWithinCampus 
            ? 'bg-green-50 border border-green-100' 
            : 'bg-amber-50 border border-amber-100'
        }`}>
          <div className="flex">
            <MapPin className={`mr-2 h-5 w-5 flex-shrink-0 ${
              isWithinCampus ? 'text-green-600' : 'text-amber-600'
            }`} />
            <div>
              <p className={`font-medium ${
                isWithinCampus ? 'text-green-700' : 'text-amber-700'
              }`}>
                {locationLoading 
                  ? 'Getting your location...' 
                  : isWithinCampus 
                    ? 'You are within campus boundaries' 
                    : 'You are outside campus boundaries'}
              </p>
              {!locationLoading && currentLocation && (
                <p className="text-xs text-muted-foreground mt-1">
                  {`Location accuracy: ±${Math.round(currentLocation.accuracy)}m • Distance: ${distance ? Math.round(distance) : '?'}m • Max allowed: ${maxAllowedDistance}m`}
                </p>
              )}
              {locationError && (
                <p className="text-xs text-red-600 mt-1">{locationError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Class information */}
        {selectedClass ? (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
            <div className="flex">
              <Clock className="text-blue-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-700 font-medium">
                  Active Attendance: {selectedClass.name}
                </p>
                <p className="text-sm text-blue-600">
                  {selectedClass.startTime && 
                    `Started at ${new Date(selectedClass.startTime.toDate()).toLocaleTimeString()}`}
                  {selectedClass.endTime && 
                    ` • Ends at ${new Date(selectedClass.endTime.toDate()).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Active Class Selected</AlertTitle>
            <AlertDescription>
              Please select an active class to mark attendance.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleMarkAttendance} 
          disabled={
            submitting || 
            locationLoading || 
            !isWithinCampus || 
            !selectedClass
          }
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Mark Attendance'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AttendanceForm;