
import React from 'react';
import { Class } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import LiveAttendanceSheet from '@/components/LiveAttendanceSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import UserReports from '@/components/UserReports';
import { collection, getDocs, query, where, orderBy, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { AttendanceRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, History, ClipboardCopy, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeolocationSettings from '@/components/GeolocationSettings';

interface AdminPanelProps {
  selectedClass: Class;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ selectedClass }) => {
  const { currentUser } = useAuth();
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch attendance history for this class
  const fetchAttendanceHistory = async () => {
    if (!selectedClass) return;
    
    setHistoryLoading(true);
    try {
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('classId', '==', selectedClass.id),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const records: AttendanceRecord[] = [];
      
      snapshot.forEach(doc => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord);
      });
      
      setAttendanceHistory(records);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance records.",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };
  
  useEffect(() => {
    if (selectedClass) {
      fetchAttendanceHistory();
    }
  }, [selectedClass]);
  
  const exportAttendanceToCsv = () => {
    if (attendanceHistory.length === 0) {
      toast({
        title: "No Records",
        description: "There are no attendance records to export.",
      });
      return;
    }
    
    const headers = ["Name", "Roll Number", "Email", "Date", "Time", "Status"];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    attendanceHistory.forEach(record => {
      const timestamp = record.timestamp?.toDate 
        ? record.timestamp.toDate().toLocaleTimeString() 
        : 'Unknown';
      
      const date = record.date || 'Unknown';
      
      const row = [
        `"${record.userName || 'Unknown'}"`,
        `"${record.rollNumber || 'N/A'}"`,
        `"${record.userEmail || 'Unknown'}"`,
        `"${date}"`,
        `"${timestamp}"`,
        `"${record.verified ? 'Present' : 'Absent'}"`,
      ];
      
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedClass.name.replace(/\s/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate a text report for copying
  const generateAttendanceReport = () => {
    if (attendanceHistory.length === 0) {
      toast({
        title: "No Records",
        description: "There are no attendance records to generate a report.",
      });
      return "";
    }
    
    // Sort and filter records
    const presentStudents = attendanceHistory
      .filter(record => record.verified)
      .sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || ""));
      
    const absentStudents = attendanceHistory
      .filter(record => !record.verified)
      .sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || ""));
    
    // Format the text report
    let report = `ATTENDANCE REPORT - ${selectedClass.name}\n`;
    report += `====================\n\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;
    report += `PRESENT STUDENTS (${presentStudents.length}):\n`;
    report += `------------------------\n`;
    
    presentStudents.forEach((student, index) => {
      report += `${index + 1}. ${student.userName || 'Unknown'} (${student.rollNumber || 'N/A'})\n`;
    });
    
    report += `\nABSENT STUDENTS (${absentStudents.length}):\n`;
    report += `------------------------\n`;
    
    absentStudents.forEach((student, index) => {
      report += `${index + 1}. ${student.userName || 'Unknown'} (${student.rollNumber || 'N/A'})\n`;
    });
    
    report += `\n====================\n`;
    report += `Total Students: ${attendanceHistory.length}\n`;
    report += `Present: ${presentStudents.length}\n`;
    report += `Absent: ${absentStudents.length}\n`;
    
    return report;
  };
  
  const copyReportToClipboard = () => {
    const report = generateAttendanceReport();
    if (!report) return;
    
    navigator.clipboard.writeText(report)
      .then(() => {
        toast({
          title: "Success",
          description: "Attendance report copied to clipboard",
        });
      })
      .catch(err => {
        console.error("Failed to copy: ", err);
        toast({
          title: "Error",
          description: "Failed to copy report to clipboard",
          variant: "destructive",
        });
      });
  };
  
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">Live Attendance</TabsTrigger>
          <TabsTrigger value="reports">Attendance Reports</TabsTrigger>
          <TabsTrigger value="userReports">User Issues</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="live">
          <LiveAttendanceSheet classId={selectedClass.id} />
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
              <CardDescription>View, export, and copy attendance reports for this class.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={exportAttendanceToCsv} className="w-full">
                    <Download className="h-4 w-4 mr-2" /> Export as CSV
                  </Button>
                  <Button onClick={copyReportToClipboard} className="w-full" variant="outline">
                    <ClipboardCopy className="h-4 w-4 mr-2" /> Copy as Text
                  </Button>
                </div>
                
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <History className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceHistory.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No attendance records found for this class.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left font-medium">Name</th>
                            <th className="px-4 py-2 text-left font-medium">Roll Number</th>
                            <th className="px-4 py-2 text-left font-medium">Date</th>
                            <th className="px-4 py-2 text-left font-medium">Time</th>
                            <th className="px-4 py-2 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.map((record) => (
                            <tr key={record.id} className="border-b">
                              <td className="px-4 py-2">{record.userName}</td>
                              <td className="px-4 py-2">{record.rollNumber || 'N/A'}</td>
                              <td className="px-4 py-2">{record.date}</td>
                              <td className="px-4 py-2">
                                {record.timestamp?.toDate 
                                  ? record.timestamp.toDate().toLocaleTimeString() 
                                  : 'Unknown'}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  record.verified 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.verified ? 'Present' : 'Absent'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={fetchAttendanceHistory} size="sm" className="ml-auto">
                <History className="h-4 w-4 mr-2" /> Refresh Data
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="userReports">
          <UserReports />
        </TabsContent>
        
        <TabsContent value="settings">
          <GeolocationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;