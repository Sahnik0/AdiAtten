import React, { useState, useEffect } from 'react';
import { Class } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import LiveAttendanceSheet from '@/components/LiveAttendanceSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import UserReports from '@/components/UserReports';
import { collection, getDocs, query, where, doc, updateDoc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { firestore, database } from '@/lib/firebase';
import { AttendanceRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, History, ClipboardCopy, Settings, RefreshCcw, Power, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeolocationSettings from '@/components/GeolocationSettings';
import { ref, remove, get } from 'firebase/database';

interface AdminPanelProps {
  selectedClass: Class;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ selectedClass }) => {
  const { currentUser } = useAuth();
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [classData, setClassData] = useState<Class | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    setClassData(selectedClass);
  }, [selectedClass]);
  
  const fetchAttendanceHistory = async () => {
    if (!selectedClass) return;
    
    setHistoryLoading(true);
    try {
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('classId', '==', selectedClass.id)
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const records: AttendanceRecord[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        records.push({
          id: doc.id,
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          rollNumber: data.rollNumber,
          timestamp: data.timestamp,
          date: data.date,
          verified: data.verified,
          location: data.location,
          classId: data.classId,
          sessionId: data.sessionId,
          automarked: data.automarked
        });
      });
      
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
      
      const unsubscribeClassListener = onSnapshot(doc(firestore, 'classes', selectedClass.id), 
        (doc) => {
          if (doc.exists()) {
            const updatedClass = { 
              id: doc.id, 
              ...doc.data() 
            } as Class;
            setClassData(updatedClass);
          }
        }, 
        (error) => {
          console.error("Error setting up class listener:", error);
        });
      
      return () => {
        unsubscribeClassListener();
      };
    }
  }, [selectedClass]);

  const startAttendanceSession = async () => {
    if (!selectedClass) return;
    
    setStartingSession(true);
    try {
      const sessionId = `${selectedClass.id}_${Date.now()}`;
      
      const classRef = doc(firestore, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        isActive: true,
        startTime: serverTimestamp(),
        currentSessionId: sessionId,
        endTime: null
      });
      
      const pendingRef = ref(database, `attendancePending/${selectedClass.id}`);
      await remove(pendingRef);
      
      toast({
        title: "Session Started",
        description: "Attendance session has been started successfully.",
      });
      
      setClassData(prev => {
        if (!prev) return selectedClass;
        return {
          ...prev,
          isActive: true,
          currentSessionId: sessionId,
          startTime: new Date()
        };
      });
      
    } catch (error) {
      console.error("Error starting attendance session:", error);
      toast({
        title: "Error",
        description: "Failed to start attendance session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartingSession(false);
    }
  };

  const endAttendanceSession = async () => {
    if (!selectedClass) return;
    
    setEndingSession(true);
    try {
      const classRef = doc(firestore, 'classes', selectedClass.id);
      const classDoc = await getDoc(classRef);
      if (!classDoc.exists()) {
        throw new Error("Class not found");
      }
      
      const classData = classDoc.data() as Class;
      
      const sessionId = classData.currentSessionId || `${selectedClass.id}_${Date.now()}`;
      
      const pendingRef = ref(database, `attendancePending/${selectedClass.id}`);
      const pendingSnapshot = await get(pendingRef);
      const pendingData = pendingSnapshot.val() || {};
      
      for (const userId in pendingData) {
        const student = pendingData[userId];
        const attendanceId = `${userId}_${selectedClass.id}_${sessionId}`;
        await setDoc(doc(firestore, 'attendance', attendanceId), {
          userId: userId,
          userEmail: student.email,
          userName: student.name,
          rollNumber: student.rollNumber || '',
          timestamp: serverTimestamp(),
          date: new Date().toISOString().split('T')[0],
          verified: true,
          classId: selectedClass.id,
          sessionId: sessionId
        });
      }
      
      const enrolledQuery = query(
        collection(firestore, 'users'),
        where('enrolledClass', '==', selectedClass.id)
      );
      
      const enrolledSnapshot = await getDocs(enrolledQuery);
      const enrolledStudents: any[] = [];
      
      enrolledSnapshot.forEach(doc => {
        enrolledStudents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      for (const student of enrolledStudents) {
        if (pendingData[student.id]) continue;
        
        const attendanceId = `${student.id}_${selectedClass.id}_${sessionId}`;
        await setDoc(doc(firestore, 'attendance', attendanceId), {
          userId: student.id,
          userEmail: student.email,
          userName: student.displayName || student.email,
          rollNumber: student.rollNumber || '',
          timestamp: serverTimestamp(),
          date: new Date().toISOString().split('T')[0],
          verified: false,
          classId: selectedClass.id,
          sessionId: sessionId,
          automarked: true
        });
      }
      
      await updateDoc(classRef, {
        isActive: false,
        endTime: serverTimestamp(),
        lastSessionId: sessionId,
        currentSessionId: null
      });
      
      await remove(pendingRef);
      
      toast({
        title: "Session Ended",
        description: "Attendance session has been ended and absent students marked.",
      });
      
      fetchAttendanceHistory();
      
      setClassData(prev => {
        if (!prev) return selectedClass;
        return {
          ...prev,
          isActive: false,
          lastSessionId: sessionId,
          currentSessionId: null,
          endTime: new Date()
        };
      });
      
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

  const exportAttendanceToCsv = () => {
    if (attendanceHistory.length === 0) {
      toast({
        title: "No Records",
        description: "There are no attendance records to export.",
      });
      return;
    }
    
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

  const generateAttendanceReportForSession = (sessionId: string, records: AttendanceRecord[]) => {
    if (records.length === 0) return "";
    
    const sessionDate = records[0]?.date || 'Unknown date';
    
    let report = `ATTENDANCE REPORT - ${selectedClass.name}\n`;
    report += `====================\n\n`;
    report += `Session: ${sessionId}\n`;
    report += `Date: ${sessionDate}\n`;
    report += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    
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
    report += `Attendance Rate: ${Math.round((presentStudents.length / records.length) * 100)}%\n`;
    
    return report;
  };
  
  const copySessionReportToClipboard = (sessionId: string, records: AttendanceRecord[]) => {
    const report = generateAttendanceReportForSession(sessionId, records);
    if (!report) return;
    
    navigator.clipboard.writeText(report)
      .then(() => {
        toast({
          title: "Success",
          description: "Session report copied to clipboard",
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

  const isActive = classData?.isActive || false;

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
            <div className="flex space-x-2 flex-wrap gap-2">
              {!isActive ? (
                <Button 
                  onClick={startAttendanceSession} 
                  variant="default"
                  disabled={startingSession}
                  className="whitespace-nowrap"
                >
                  {startingSession ? (
                    <>
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Attendance Session
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={endAttendanceSession} 
                  variant="destructive"
                  disabled={endingSession}
                  className="whitespace-nowrap"
                >
                  {endingSession ? (
                    <>
                      Ending Session...
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      End Attendance Session
                    </>
                  )}
                </Button>
              )}
            </div>
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
                    <Download className="h-4 w-4 mr-2" /> Export all as CSV
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
                    <h3 className="font-medium text-lg">Attendance History</h3>
                    
                    {Object.entries(attendanceHistory.reduce((acc, record) => {
                      const sessionId = record.sessionId || 'unknown';
                      if (!acc[sessionId]) {
                        acc[sessionId] = [];
                      }
                      acc[sessionId].push(record);
                      return acc;
                    }, {} as Record<string, AttendanceRecord[]>))
                    .sort(([sessionIdA], [sessionIdB]) => sessionIdB.localeCompare(sessionIdA))
                    .map(([sessionId, records]) => {
                      const sessionDate = records[0]?.date || 'Unknown';
                      const presentCount = records.filter(r => r.verified).length;
                      const totalCount = records.length;
                      
                      return (
                        <Card key={sessionId} className="mb-4">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-base">
                                  Session: {sessionDate}
                                </CardTitle>
                                <CardDescription>
                                  Present: {presentCount}/{totalCount} ({Math.round((presentCount/totalCount) * 100)}%)
                                </CardDescription>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => copySessionReportToClipboard(sessionId, records)}
                              >
                                <ClipboardCopy className="h-4 w-4 mr-1" /> Copy Report
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="rounded-md border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-2 text-left font-medium">Name</th>
                                    <th className="px-4 py-2 text-left font-medium">Roll Number</th>
                                    <th className="px-4 py-2 text-left font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {records.map((record) => (
                                    <tr key={record.id} className="border-b">
                                      <td className="px-4 py-2">{record.userName}</td>
                                      <td className="px-4 py-2">{record.rollNumber || 'N/A'}</td>
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
                          </CardContent>
                        </Card>
                      );
                    })}
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
          <UserReports classId={selectedClass.id} />
        </TabsContent>
        
        <TabsContent value="settings">
          <GeolocationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;