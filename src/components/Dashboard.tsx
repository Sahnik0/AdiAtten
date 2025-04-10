
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import AdminPanel from './ui/AdminPanel';
import EmailVerification from './EmailVerification';
import ClassManagement from './ClassManagement';
import { Class } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, School, MapPin, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceFormWrapper from './AttendanceFormWrapper';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import LiveAttendanceSheet from './LiveAttendanceSheet';
import ReportIssue from './ReportIssue';
import LocationPermission from './LocationPermission';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';

const Dashboard = () => {
  const { currentUser, isDeviceVerified } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>(currentUser?.isAdmin ? 'admin' : 'attendance');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [enrolledClass, setEnrolledClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [silentlyRefreshing, setSilentlyRefreshing] = useState(false);
  const { isWithinCampus, distance, error, requestLocation } = useGeolocation();

  useEffect(() => {
    const fetchClasses = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      // Only show loading on first load, not on refresh
      if (!silentlyRefreshing) {
        setLoading(true);
      } else {
        setSilentlyRefreshing(true);
      }
      
      try {
        if (currentUser.isAdmin) {
          // For admin: Get class from localStorage if any
          const classId = localStorage.getItem('selectedAdminClassId');
          if (classId) {
            const classDoc = await getDoc(doc(firestore, 'classes', classId));
            if (classDoc.exists()) {
              setSelectedClass({ id: classDoc.id, ...classDoc.data() } as Class);
            }
          }
        } else {
          // For students: Find their enrolled class
          const enrolledQuery = query(
            collection(firestore, 'classes'),
            where('students', 'array-contains', currentUser.uid)
          );
          
          const enrolledSnapshot = await getDocs(enrolledQuery);
          
          if (!enrolledSnapshot.empty) {
            const enrolledClassData = enrolledSnapshot.docs[0];
            const classData = { id: enrolledClassData.id, ...enrolledClassData.data() } as Class;
            setEnrolledClass(classData);
            setSelectedClass(classData);
          }
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setLoading(false);
        setSilentlyRefreshing(false);
      }
    };

    fetchClasses();
    
    // Set up an interval to silently refresh class data
    const intervalId = setInterval(() => {
      setSilentlyRefreshing(true);
      fetchClasses();
    }, 19000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  if (!currentUser || !isDeviceVerified) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {currentUser.displayName || currentUser.email?.split('@')[0]}
            </h1>
            <p className="text-muted-foreground">
              {currentUser.email} 
              {currentUser.rollNumber && ` • Roll Number: ${currentUser.rollNumber}`}
              {currentUser.isAdmin && ` • Admin`}
            </p>
            {selectedClass && (
              <p className="mt-1 text-sm font-medium text-blue-600">
                Selected Class: {selectedClass.name}
              </p>
            )}
            
            {!currentUser.isAdmin && (
              <p className="mt-1 text-sm">
                <span className={isWithinCampus ? "text-green-600" : "text-red-600"}>
                  <MapPin className="inline-block h-4 w-4 mr-1" />
                  {isWithinCampus 
                    ? "You are within campus boundaries" 
                    : `You are ${Math.round(distance || 0)}m away from campus`}
                </span>
              </p>
            )}
          </div>
          {!currentUser.isAdmin && selectedClass && (
            <div className="mt-2 md:mt-0 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocation}
                className="flex items-center gap-1"
              >
                <MapPin className="h-4 w-4" />
                Update Location
              </Button>
              <ReportIssue classId={selectedClass.id} />
            </div>
          )}
        </div>
      </div>

      {/* Email verification notice for admins only */}
      {currentUser.isAdmin && !currentUser.emailVerified && <EmailVerification />}

      {/* Only show loading spinner on initial load, not during silent refreshes */}
      {loading && !silentlyRefreshing ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Please wait while we load your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : currentUser.isAdmin ? (
        <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="w-full mb-4">
            {selectedClass && (
              <>
                <TabsTrigger value="admin" className="flex-1">Admin Dashboard</TabsTrigger>
                <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
              </>
            )}
            <TabsTrigger value="classes" className="flex-1">Class Management</TabsTrigger>
          </TabsList>
          
          {selectedClass && (
            <>
              <TabsContent value="admin">
                <AdminPanel selectedClass={selectedClass} />
              </TabsContent>
              <TabsContent value="attendance">
                <div className="space-y-6">
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <School className="mr-2 h-5 w-5" /> Attendance Status
                      </CardTitle>
                      <CardDescription>Mark attendance for {selectedClass.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
                        <div className="flex">
                          <AlertCircle className="text-blue-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-blue-700 font-medium">Location Verification</p>
                            <p className="text-sm text-blue-600">
                              Make sure you're physically present on campus when marking attendance.
                              Your location will be verified through the system.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <AttendanceFormWrapper selectedClass={selectedClass} />
                </div>
              </TabsContent>
            </>
          )}
          
          <TabsContent value="classes">
            <ClassManagement onClassSelect={(classObj) => {
              setSelectedClass(classObj);
              localStorage.setItem('selectedAdminClassId', classObj.id);
              setSelectedTab('admin');
            }} />
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          {/* Student view */}
          <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
              <TabsTrigger value="live" className="flex-1">Live Attendance</TabsTrigger>
              <TabsTrigger value="classes" className="flex-1">My Classes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendance">
              <LocationPermission />
              
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <School className="mr-2 h-5 w-5" /> Attendance Status
                  </CardTitle>
                  <CardDescription>
                    {enrolledClass 
                      ? `Mark your attendance for ${enrolledClass.name}` 
                      : "Join a class to mark attendance"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
                      <div className="flex">
                        <AlertCircle className="text-blue-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-700 font-medium">Location Verification</p>
                          <p className="text-sm text-blue-600">
                            Make sure you're physically present on campus when marking attendance.
                            Your location will be verified through the system.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-4 rounded-md ${isWithinCampus ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                      <div className="flex">
                        <MapPin className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${isWithinCampus ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                          <p className={`font-medium ${isWithinCampus ? 'text-green-700' : 'text-red-700'}`}>
                            {isWithinCampus 
                              ? "You are within campus boundaries" 
                              : `You are ${Math.round(distance || 0)}m away from campus`}
                          </p>
                          {!isWithinCampus && (
                            <p className="text-sm text-red-600 mt-1">
                              You need to be within campus boundaries to mark attendance.
                            </p>
                          )}
                          {error && (
                            <p className="text-sm text-red-600 mt-1">
                              Error: {error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={requestLocation}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update My Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <AttendanceFormWrapper selectedClass={enrolledClass} />
            </TabsContent>
            
            <TabsContent value="live">
              {enrolledClass ? (
                <LiveAttendanceSheet classId={enrolledClass.id} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Class Selected</CardTitle>
                    <CardDescription>You need to join a class to view live attendance.</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="classes">
              <ClassManagement />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default Dashboard;