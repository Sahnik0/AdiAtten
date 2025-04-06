import React from 'react';
import { Class as ClassType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import LiveAttendanceSheet from '@/components/LiveAttendanceSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import UserReports from '@/components/UserReports';
import { collection, getDocs, query, where, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, database } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { AttendanceRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, History, ClipboardCopy, Settings, RefreshCw, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeolocationSettings from '@/components/GeolocationSettings';
import { ref, remove, get } from 'firebase/database';

export interface ExtendedClass extends ClassType {
  currentSessionId?: string;
}

interface AdminPanelProps {
  selectedClass: ExtendedClass;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ selectedClass }) => {
  const { currentUser } = useAuth();
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const { toast } = useToast();
  
  const fetchAttendanceHistory = async () => {
    if (!selectedClass) return;
    
    setHistoryLoading(true);
    try {
      // Use a simpler query to avoid index issues
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('classId', '==', selectedClass.id)
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const records: AttendanceRecord[] = [];
      
      snapshot.forEach(doc => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord);
      });
      
      // Sort by timestamp
      records.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
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

  const endAttendanceSession = async () => {
    if (!selectedClass) return;
    
    setEndingSession(true);
    try {
      // Get current session ID
      const sessionId = selectedClass.currentSessionId || new Date().toISOString().split('T')[0];
      
      // Get the pending attendance data
      const pendingRef = ref(database, `attendancePending/${selectedClass.id}`);
      const pendingSnapshot = await get(pendingRef);
      const pendingData = pendingSnapshot.val() || {};
      
      // Get all enrolled students
      const enrolledQuery = query(
        collection(firestore, 'users'),
        where('classes', 'array-contains', selectedClass.id)
      );
      
      // If the above query doesn't work, try this alternative:
      // const classDoc = await getDoc(doc(firestore, 'classes', selectedClass.id));
      // const enrolledStudents = classDoc.data()?.students || [];
      
      const enrolledSnapshot = await getDocs(enrolledQuery);
      const enrolledStudents: any[] = [];
      
      enrolledSnapshot.forEach(doc => {
        enrolledStudents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Mark absent for students who didn't mark attendance
      const today = new Date().toISOString().split('T')[0];
      
      for (const student of enrolledStudents) {
        // Skip if student already marked attendance
        if (pendingData[student.id]) continue;
        
        // Mark student as absent
        const attendanceId = `${student.id}_${selectedClass.id}_${sessionId}`;
        await setDoc(doc(firestore, 'attendance', attendanceId), {
          userId: student.id,
          userEmail: student.email,
          userName: student.displayName || student.email,
          rollNumber: student.rollNumber || '',
          timestamp: serverTimestamp(),
          date: today,
          verified: false, // Marked as absent
          classId: selectedClass.id,
          sessionId: sessionId,
          automarked: true // Flag to indicate this was automatically marked
        });
      }
      
      // Update class to inactive
      const classRef = doc(firestore, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        isActive: false,
        endTime: serverTimestamp(),
        // Store the session ID so we can reference it later
        lastSessionId: sessionId,
        currentSessionId: null
      });
      
      // Clear pending attendance data
      await remove(pendingRef);
      
      toast({
        title: "Session Ended",
        description: "Attendance session has been ended and absent students marked.",
      });
      
      fetchAttendanceHistory();
    } catch (error) {
      console.error("Error ending attendance session:", error);
      toast({
        title: "Error",
        description: "Failed to end attendance session.",
        variant: "destructive",
      });
    } finally {
      setEndingSession(false);
    }
  };

  const resetDeviceId = async (userId: string) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        deviceId: null
      });
      
      toast({
        title: "Device Reset",
        description: "User device ID has been reset. They can now login from a new device.",
      });
    } catch (error) {
      console.error("Error resetting device ID:", error);
      toast({
        title: "Error",
        description: "Failed to reset user device ID.",
        variant: "destructive",
      });
    }
  };
  
  const exportAttendanceToCsv = () => {
    if (attendanceHistory.length === 0) {
      toast({
        title: "No Records",
        description: "There are no attendance records to export.",
      });
      return;
    }
    
    // Group by session ID to sort reports by session
    const sessionGroups: Record<string, AttendanceRecord[]> = {};
    attendanceHistory.forEach(record => {
      const sessionId = record.sessionId || 'unknown';
      if (!sessionGroups[sessionId]) {
        sessionGroups[sessionId] = [];
      }
      sessionGroups[sessionId].push(record);
    });
    
    const headers = ["Session", "Name", "Roll Number", "Email", "Date", "Time", "Status"];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    // Sort by most recent sessions first
    const sortedSessions = Object.keys(sessionGroups).sort().reverse();
    
    sortedSessions.forEach(sessionId => {
      const records = sessionGroups[sessionId];
      records.forEach(record => {
        const timestamp = record.timestamp?.toDate 
          ? record.timestamp.toDate().toLocaleTimeString() 
          : 'Unknown';
        
        const date = record.date || 'Unknown';
        
        const row = [
          `"${record.sessionId || 'Unknown'}"`,
          `"${record.userName || 'Unknown'}"`,
          `"${record.rollNumber || 'N/A'}"`,
          `"${record.userEmail || 'Unknown'}"`,
          `"${date}"`,
          `"${timestamp}"`,
          `"${record.verified ? 'Present' : 'Absent'}"`,
        ];
        
        csvRows.push(row.join(','));
      });
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

  const generateAttendanceReport = () => {
    if (attendanceHistory.length === 0) {
      toast({
        title: "No Records",
        description: "There are no attendance records to generate a report.",
      });
      return "";
    }
    
    // Group by session ID
    const sessionGroups: Record<string, AttendanceRecord[]> = {};
    attendanceHistory.forEach(record => {
      const sessionId = record.sessionId || 'unknown';
      if (!sessionGroups[sessionId]) {
        sessionGroups[sessionId] = [];
      }
      sessionGroups[sessionId].push(record);
    });
    
    // Sort by most recent sessions first
    const sortedSessions = Object.keys(sessionGroups).sort().reverse();
    
    let report = `ATTENDANCE REPORT - ${selectedClass.name}\n`;
    report += `====================\n\n`;
    report += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    
    sortedSessions.forEach(sessionId => {
      const records = sessionGroups[sessionId];
      const sessionDate = records[0]?.date || 'Unknown date';
      
      report += `SESSION: ${sessionId} (${sessionDate})\n`;
      report += `=====================\n\n`;
      
      const presentStudents = records
        .filter(record => record.verified)
        .sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || ""));
        
      const absentStudents = records
        .filter(record => !record.verified)
        .sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || ""));
      
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
      
      report += `\nSESSION SUMMARY:\n`;
      report += `Total Students: ${records.length}\n`;
      report += `Present: ${presentStudents.length}\n`;
      report += `Absent: ${absentStudents.length}\n`;
      report += `Attendance Rate: ${Math.round((presentStudents.length / records.length) * 100)}%\n\n`;
      report += `====================\n\n`;
    });
    
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
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>Use the tabs below to manage attendance and view reports for this class.</p>
            <Button 
              onClick={endAttendanceSession} 
              variant="destructive"
              disabled={endingSession || !selectedClass.isActive}
              className="whitespace-nowrap"
            >
              {endingSession ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Ending Session...
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  End Attendance Session
                </>
              )}
            </Button>
          </div>
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
                            <th className="px-4 py-2 text-left font-medium">Session</th>
                            <th className="px-4 py-2 text-left font-medium">Status</th>
                            <th className="px-4 py-2 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.map((record) => (
                            <tr key={record.id} className="border-b">
                              <td className="px-4 py-2">{record.userName}</td>
                              <td className="px-4 py-2">{record.rollNumber || 'N/A'}</td>
                              <td className="px-4 py-2">{record.date}</td>
                              <td className="px-4 py-2">{record.sessionId || 'Unknown'}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  record.verified 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.verified ? 'Present' : 'Absent'}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => resetDeviceId(record.userId)}
                                  title="Reset Device ID"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
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