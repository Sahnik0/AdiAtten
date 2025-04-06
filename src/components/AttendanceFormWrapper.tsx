
import React, { useEffect, useState, useCallback } from 'react';
import AttendanceForm from './AttendanceForm';
import LiveAttendanceSheet from './LiveAttendanceSheet';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Class } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RefreshCcw, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AttendanceFormWrapperProps {
  selectedClass?: Class | null;
}

const AttendanceFormWrapper: React.FC<AttendanceFormWrapperProps> = ({ selectedClass: propSelectedClass }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeClasses, setActiveClasses] = useState<Class[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the most current class data
  const fetchCurrentClassData = useCallback(async (classId: string): Promise<Class | null> => {
    try {
      const classDoc = await getDoc(doc(firestore, 'classes', classId));
      if (classDoc.exists()) {
        return { id: classDoc.id, ...classDoc.data() } as Class;
      }
      return null;
    } catch (error) {
      console.error("Error fetching class data:", error);
      return null;
    }
  }, []);

  // Fetch available classes and active classes for the current user
  const fetchClasses = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // First use the class from props if available
      if (propSelectedClass) {
        // Always get the most current data
        const currentClassData = await fetchCurrentClassData(propSelectedClass.id);
        if (currentClassData) {
          setSelectedClass(currentClassData);
          setAvailableClasses([currentClassData]);
          setActiveClasses(currentClassData.isActive ? [currentClassData] : []);
        } else {
          setSelectedClass(propSelectedClass);
          setAvailableClasses([propSelectedClass]);
          setActiveClasses(propSelectedClass.isActive ? [propSelectedClass] : []);
        }
        setLoading(false);
        return;
      }
      
      let userClasses: Class[] = [];
      
      if (currentUser.isAdmin) {
        // For admins, only show classes they selected in the dashboard
        if (localStorage.getItem('selectedAdminClassId')) {
          const classId = localStorage.getItem('selectedAdminClassId');
          const currentClassData = await fetchCurrentClassData(classId || '');
          
          if (currentClassData) {
            userClasses = [currentClassData];
          }
        }
      } else {
        // For students, only show classes they're enrolled in
        const enrolledQuery = query(
          collection(firestore, 'classes'),
          where('students', 'array-contains', currentUser.uid)
        );
        
        const enrolledSnapshot = await getDocs(enrolledQuery);
        
        // Get the latest data for each class
        const classPromises = enrolledSnapshot.docs.map(async (doc) => {
          const currentClass = await fetchCurrentClassData(doc.id);
          return currentClass;
        });
        
        const classes = await Promise.all(classPromises);
        userClasses = classes.filter(Boolean) as Class[];
      }
      
      setAvailableClasses(userClasses);
      
      // Filter active classes
      const active = userClasses.filter(cls => cls.isActive);
      setActiveClasses(active);
      
      // For students, automatically select their enrolled class if it's active
      if (!currentUser.isAdmin) {
        if (active.length > 0) {
          setSelectedClass(active[0]);
        } else if (userClasses.length > 0) {
          setSelectedClass(userClasses[0]);
        }
      } 
      // For admins, select the active class from their selected class
      else if (currentUser.isAdmin && active.length > 0) {
        setSelectedClass(active[0]);
      } else if (userClasses.length > 0) {
        setSelectedClass(userClasses[0]);
      }
      
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch classes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, propSelectedClass, fetchCurrentClassData, toast]);
  
  useEffect(() => {
    fetchClasses();
    
    // Set up a refresh interval to check for active classes
    const intervalId = setInterval(fetchClasses, 10000); // 10 seconds - faster refresh
    
    return () => clearInterval(intervalId);
  }, [fetchClasses]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchClasses();
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking Active Classes</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If user is not enrolled in any class (students only)
  if (!currentUser?.isAdmin && availableClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Classes Available</CardTitle>
          <CardDescription>
            You need to be enrolled in a class to mark attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ask your instructor to approve your enrollment in a class.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!selectedClass) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Class Selected</CardTitle>
          <CardDescription>
            {currentUser?.isAdmin 
              ? "Please select a class from the Class Management tab first."
              : "Please join a class to mark attendance."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {currentUser?.isAdmin
              ? "You need to select a class to view its attendance."
              : "You need to enroll in a class to mark attendance."}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If no active classes for students
  if (!currentUser?.isAdmin && activeClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Attendance</CardTitle>
          <CardDescription>
            There are no active attendance sessions at the moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Wait for your instructor to start an attendance session.
            </p>
            
            {availableClasses.length > 0 && selectedClass && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
                <div className="flex">
                  <AlertCircle className="text-blue-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-700 font-medium">Your Selected Class</p>
                    <p className="text-sm text-blue-600 mt-2">
                      {selectedClass.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance for {selectedClass?.name || 'Your Class'}</CardTitle>
          <CardDescription>
            {selectedClass?.isActive 
              ? "Attendance session is active"
              : "No active attendance session"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedClass && selectedClass.isActive && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-md">
                <div className="flex">
                  <Clock className="text-green-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-700 font-medium">
                      Active Attendance: {selectedClass.name}
                    </p>
                    <p className="text-sm text-green-600">
                      {selectedClass.startTime && 
                        `Started at ${new Date(selectedClass.startTime.toDate()).toLocaleTimeString()}`}
                      {selectedClass.endTime && 
                        ` • Ends at ${new Date(selectedClass.endTime.toDate()).toLocaleTimeString()}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {selectedClass && !selectedClass.isActive && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                <div className="flex">
                  <Clock className="text-gray-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-700 font-medium">
                      No Active Attendance Session
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentUser?.isAdmin 
                        ? "Start an attendance session from the Class Management tab."
                        : "Wait for your instructor to start an attendance session."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
      
      <Tabs defaultValue="mark-attendance" className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="mark-attendance" className="flex-1">Mark Attendance</TabsTrigger>
          <TabsTrigger value="live-attendance" className="flex-1">Live Attendance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mark-attendance">
          <AttendanceForm selectedClass={selectedClass} />
        </TabsContent>
        
        <TabsContent value="live-attendance">
          <LiveAttendanceSheet classId={selectedClass?.id || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceFormWrapper;