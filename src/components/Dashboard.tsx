
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import AttendanceForm from './AttendanceForm';
import AdminPanel from '../components/ui/adminPanel';
import EmailVerification from './EmailVerification';
import ClassManagement from './ClassManagement';
import { Class } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, School } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceFormWrapper from './AttendanceFormWrapper';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import LiveAttendanceSheet from '../components/LiveAttendanceSheet';

const Dashboard = () => {
  const { currentUser, isDeviceVerified } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>(currentUser?.isAdmin ? 'admin' : 'attendance');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [enrolledClass, setEnrolledClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
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
      }
    };

    fetchClasses();
  }, [currentUser]);

  if (!currentUser || !isDeviceVerified) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
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
      </div>

      {/* Email verification notice for admins only */}
      {currentUser.isAdmin && !currentUser.emailVerified && <EmailVerification />}

      {currentUser.isAdmin ? (
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