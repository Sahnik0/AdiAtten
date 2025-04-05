
import React from 'react';
import { Class } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LiveAttendanceSheet from '@/components/LiveAttendanceSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import UserReports from '@/components/UserReports';

interface AdminPanelProps {
  selectedClass: Class;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ selectedClass }) => {
  const { currentUser } = useAuth();
  
  if (!selectedClass || !currentUser?.isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Class Selected</CardTitle>
          <CardDescription>Please select a class to view the admin dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Admin Dashboard for {selectedClass.name}</CardTitle>
          <CardDescription>Manage attendance and students for {selectedClass.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Use the tabs below to manage attendance and view reports for this class.</p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="live">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Live Attendance</TabsTrigger>
          <TabsTrigger value="reports">Attendance Reports</TabsTrigger>
          <TabsTrigger value="userReports">User Issues</TabsTrigger>
        </TabsList>
        
        <TabsContent value="live">
          <LiveAttendanceSheet classId={selectedClass.id} />
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
              <CardDescription>View and export attendance reports for this class.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Attendance reports will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="userReports">
          <UserReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;