
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';
import { firestore, database } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, AlertTriangle, Check, Clock, RefreshCw } from 'lucide-react';
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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);

  // Function to check attendance status
  const checkAttendanceStatus = useCallback(async () => {
    if (!currentUser || !selectedClass) {
      setAttendanceMarked(false);
      return;
    }
    
    setLoadingSession(true);
    
    try {
      // Get the latest class data to check active status
      const classDoc = await getDoc(doc(firestore, 'classes', selectedClass.id));
      const classData = classDoc.exists() ? classDoc.data() as Class : null;
      
      if (!classData || !classData.isActive) {
        setAttendanceMarked(false);
        setLoadingSession(false);
        return;
      }
      
      const sessionId = classData.currentSessionId || 'latest';
      
      // Check if this student already marked attendance for the current session
      const attendanceRef = ref(database, `attendancePending/${selectedClass.id}/${currentUser.uid}`);
      const pendingSnapshot = await get(attendanceRef);
      
      const firestoreRef = doc(firestore, 'attendance', `${currentUser.uid}_${selectedClass.id}_${sessionId}`);
      const fsSnapshot = await getDoc(firestoreRef);
      
      setAttendanceMarked(pendingSnapshot.exists() || fsSnapshot.exists());
    } catch (error) {
      console.error("Error checking attendance status:", error);
      setAttendanceMarked(false);
    } finally {
      setLoadingSession(false);
    }
  }, [currentUser, selectedClass]);

  useEffect(() => {
    checkAttendanceStatus();
    
    // Set up polling to check attendance status every 15 seconds
    const intervalId = setInterval(checkAttendanceStatus, 15000);
    
    return () => clearInterval(intervalId);
  }, [checkAttendanceStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAttendanceStatus();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

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

    // Recheck class status before submitting
    const classDoc = await getDoc(doc(firestore, 'classes', selectedClass.id));
    const classData = classDoc.exists() ? classDoc.data() as Class : null;
    
    if (!classData || !classData.isActive) {
      toast({
        title: "Error",
        description: "There is no active attendance session for this class.",
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
      const sessionId = classData.currentSessionId || today;
      const attendanceId = `${currentUser.uid}_${selectedClass.id}_${sessionId}`;

      // Store in Firestore for permanent record
      await setDoc(doc(firestore, 'attendance', attendanceId), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        rollNumber: currentUser.rollNumber || '',
        timestamp: serverTimestamp(),
        date: today,
        verified: true, // Automatically mark as present if successful
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy
        },
        classId: selectedClass.id,
        sessionId: sessionId
      });

      // Store in Realtime Database for live updates
      await set(ref(database, `attendancePending/${selectedClass.id}/${currentUser.uid}`), {
        email: currentUser.email,
        name: currentUser.displayName || currentUser.email?.split('@')[0],
        rollNumber: currentUser.rollNumber || '',
        timestamp: Date.now(),
        date: today,
        classId: selectedClass.id,
        sessionId: sessionId
      });

      setAttendanceMarked(true);
      toast({
        title: "Success",
        description: "Your attendance has been marked successfully.",
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
          <CardDescription>Your attendance has been recorded successfully for this session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-100 p-4 rounded-md">
            <p className="text-green-800">
              You've marked your attendance for today's session of {selectedClass?.name}. 
              You don't need to mark attendance again for this session.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            className="w-full"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
              </>
            )}
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

        {selectedClass ? (
          <div className={`p-4 rounded-md ${
            selectedClass.isActive 
              ? 'bg-blue-50 border border-blue-100' 
              : 'bg-gray-50 border border-gray-100'
          }`}>
            <div className="flex">
              <Clock className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${
                selectedClass.isActive ? 'text-blue-500' : 'text-gray-500'
              }`} />
              <div>
                <p className={`font-medium ${
                  selectedClass.isActive ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {loadingSession ? 'Checking session status...' : (
                    selectedClass.isActive 
                      ? `Active Attendance: ${selectedClass.name}` 
                      : `No Active Attendance for ${selectedClass.name}`
                  )}
                </p>
                {selectedClass.isActive && !loadingSession && (
                  <p className="text-sm text-blue-600">
                    {selectedClass.startTime && 
                      `Started at ${new Date(selectedClass.startTime.toDate()).toLocaleTimeString()}`}
                    {selectedClass.endTime && 
                      ` • Ends at ${new Date(selectedClass.endTime.toDate()).toLocaleTimeString()}`}
                  </p>
                )}
                {!selectedClass.isActive && !loadingSession && (
                  <p className="text-sm text-gray-600">
                    Wait for your instructor to start an attendance session.
                  </p>
                )}
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
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={handleMarkAttendance} 
          disabled={
            submitting || 
            locationLoading || 
            !isWithinCampus || 
            !selectedClass ||
            !selectedClass.isActive ||
            attendanceMarked ||
            loadingSession
          }
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Mark Attendance'}
        </Button>
        
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          className="w-full"
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AttendanceForm;