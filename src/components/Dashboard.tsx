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
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  // Handle window resize without custom hooks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine responsive breakpoints
  const isMobile = windowWidth < 640;
  const isXs = windowWidth < 480;

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
    }, 19000); // Refresh every 19 seconds
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  if (!currentUser || !isDeviceVerified) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
      <div className="mb-3 sm:mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-2 sm:gap-0">
          <div className="w-full sm:w-auto">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
              Welcome, {currentUser.displayName || currentUser.email?.split('@')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {currentUser.email} 
              {currentUser.rollNumber && ` • Roll: ${currentUser.rollNumber}`}
              {currentUser.isAdmin && ` • Admin`}
            </p>
            {selectedClass && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-blue-600 truncate">
                Class: {selectedClass.name}
              </p>
            )}
            
            {!currentUser.isAdmin && (
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm">
                <span className={isWithinCampus ? "text-green-600" : "text-red-600"}>
                  <MapPin className="inline-block h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                  {isWithinCampus 
                    ? "Within campus" 
                    : `${Math.round(distance || 0)}m away`}
                </span>
              </p>
            )}
          </div>
          {!currentUser.isAdmin && selectedClass && (
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size={isXs ? "icon" : "sm"}
                onClick={requestLocation}
                className="h-7 sm:h-8"
                title="Update Location"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                {!isXs && <span className="ml-1 text-xs">Location</span>}
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
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3">
            <CardTitle className="text-base sm:text-lg">Loading...</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Please wait while we load your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4 sm:py-8 px-3 sm:px-6">
            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : currentUser.isAdmin ? (
        <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="w-full mb-2 sm:mb-4 h-8 sm:h-10 text-xs sm:text-sm">
            {selectedClass && (
              <>
                <TabsTrigger value="admin" className="flex-1">Admin</TabsTrigger>
                <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
              </>
            )}
            <TabsTrigger value="classes" className="flex-1">Classes</TabsTrigger>
          </TabsList>
          
          {selectedClass && (
            <>
              <TabsContent value="admin">
                <AdminPanel selectedClass={selectedClass} />
              </TabsContent>
              <TabsContent value="attendance">
                <div className="space-y-3 sm:space-y-6">
                  <Card className="mb-3 sm:mb-6">
                    <CardHeader className="pb-2 px-3 sm:px-6 pt-3">
                      <CardTitle className="flex items-center text-base sm:text-lg">
                        <School className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Attendance Status
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Mark attendance for {selectedClass.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
                      <div className="bg-blue-50 border border-blue-100 p-2 sm:p-4 rounded-md">
                        <div className="flex">
                          <AlertCircle className="text-blue-500 h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-blue-700 font-medium text-xs sm:text-sm">Location Verification</p>
                            <p className="text-xs text-blue-600">
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
            <TabsList className="w-full mb-2 sm:mb-4 h-8 sm:h-10 text-xs sm:text-sm">
              <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
              <TabsTrigger value="live" className="flex-1">Live</TabsTrigger>
              <TabsTrigger value="classes" className="flex-1">Classes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendance">
              <LocationPermission />
              
              <Card className="mb-3 sm:mb-6">
                <CardHeader className="pb-2 px-3 sm:px-6 pt-3">
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <School className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Attendance Status
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {enrolledClass 
                      ? `Mark attendance for ${enrolledClass.name}` 
                      : "Join a class to mark attendance"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-2 sm:p-4 rounded-md">
                      <div className="flex">
                        <AlertCircle className="text-blue-500 h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-700 font-medium text-xs sm:text-sm">Location Verification</p>
                          <p className="text-xs text-blue-600">
                            Make sure you're physically present on campus when marking attendance.
                            Your location will be verified through the system.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-2 sm:p-4 rounded-md ${isWithinCampus ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                      <div className="flex">
                        <MapPin className={`h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0 mt-0.5 ${isWithinCampus ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                          <p className={`font-medium text-xs sm:text-sm ${isWithinCampus ? 'text-green-700' : 'text-red-700'}`}>
                            {isWithinCampus 
                              ? "You are within campus boundaries" 
                              : `You are ${Math.round(distance || 0)}m away from campus`}
                          </p>
                          {!isWithinCampus && (
                            <p className="text-xs text-red-600 mt-0.5 sm:mt-1">
                              You need to be within campus boundaries to mark attendance.
                            </p>
                          )}
                          {error && (
                            <p className="text-xs text-red-600 mt-0.5 sm:mt-1">
                              Error: {error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={requestLocation}
                      className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                      variant="outline"
                    >
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
                  <CardHeader className="pb-2 px-3 sm:px-6 pt-3">
                    <CardTitle className="text-base sm:text-lg">No Class Selected</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">You need to join a class to view live attendance.</CardDescription>
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