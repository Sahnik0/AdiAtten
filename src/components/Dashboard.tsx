
import { useAuth } from '@/hooks/useAuth';
import AttendanceForm from './AttendanceForm';
import AdminPanel from './AdminPanel';
import EmailVerification from './EmailVerification';
import ClassManagement from './ClassManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, School } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceFormWrapper from './AttendanceFormWrapper';
import { useState } from 'react';

const Dashboard = () => {
  const { currentUser, isDeviceVerified } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>(currentUser?.isAdmin ? 'admin' : 'attendance');

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
      </div>

      {/* Email verification notice for admins only */}
      {currentUser.isAdmin && !currentUser.emailVerified && <EmailVerification />}

      {currentUser.isAdmin ? (
        <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="admin" className="flex-1">Admin Dashboard</TabsTrigger>
            <TabsTrigger value="classes" className="flex-1">Class Management</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
          </TabsList>
          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
          <TabsContent value="classes">
            <ClassManagement />
          </TabsContent>
          <TabsContent value="attendance">
            <div className="space-y-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <School className="mr-2 h-5 w-5" /> Attendance Status
                  </CardTitle>
                  <CardDescription>Mark your attendance for the current class session</CardDescription>
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
              
              <AttendanceFormWrapper />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          {/* Student view */}
          <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
              <TabsTrigger value="classes" className="flex-1">My Classes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendance">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <School className="mr-2 h-5 w-5" /> Attendance Status
                  </CardTitle>
                  <CardDescription>Mark your daily attendance</CardDescription>
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
              
              <AttendanceFormWrapper />
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
