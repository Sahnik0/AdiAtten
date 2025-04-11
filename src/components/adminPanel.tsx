import React, { useState, useEffect } from 'react';
import { Class } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import LiveAttendanceSheet from '@/components/LiveAttendanceSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import UserReports from '@/components/UserReports';
import { collection, getDocs, query, where, doc, updateDoc, setDoc, serverTimestamp, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { firestore, database } from '@/lib/firebase';
import { AttendanceRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, History, ClipboardCopy, Settings, RefreshCcw, Power, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeolocationSettings from '@/components/GeolocationSettings';
import { ref, remove, get } from 'firebase/database';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
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

  const deleteAttendanceSession = async (sessionId: string) => {
    if (!sessionId) return;
    
    setDeletingSession(true);
    try {
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('sessionId', '==', sessionId),
        where('classId', '==', selectedClass.id)
      );
      
      const snapshot = await getDocs(attendanceQuery);
      
      const batch = writeBatch(firestore);
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      toast({
        title: "Session Deleted",
        description: "Attendance records for this session have been deleted.",
      });
      
      fetchAttendanceHistory();
      
    } catch (error) {
      console.error("Error deleting attendance session:", error);
      toast({
        title: "Error",
        description: "Failed to delete attendance session.",
        variant: "destructive",
      });
    } finally {
      setDeletingSession(false);
      setDeleteSessionId(null);
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
    
    // Sort all records by roll number
    const sortedRecords = [...records].sort((a, b) => {
      const rollA = (a.rollNumber || '').toString();
      const rollB = (b.rollNumber || '').toString();
      
      const numA = parseInt(rollA);
      const numB = parseInt(rollB);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      return rollA.localeCompare(rollB);
    });
    
    const presentStudents = sortedRecords.filter(record => record.verified);
    const absentStudents = sortedRecords.filter(record => !record.verified);
    
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
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="py-3 md:py-6">
          <CardTitle className="text-lg md:text-2xl font-bold">
            {selectedClass.name}
          </CardTitle>
          <CardDescription className="text-sm">
            Manage attendance and students
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 px-3 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <p className="text-sm md:text-base">Use the tabs below to manage attendance</p>
            <div className="w-full md:w-auto">
              {!isActive ? (
                <Button 
                  onClick={startAttendanceSession} 
                  variant="default"
                  disabled={startingSession}
                  className="w-full md:w-auto text-xs md:text-sm py-1.5"
                  size="sm"
                >
                  {startingSession ? (
                    <>Starting...</>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1.5" />
                      Start Session
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={endAttendanceSession} 
                  variant="destructive"
                  disabled={endingSession}
                  className="w-full md:w-auto text-xs md:text-sm py-1.5"
                  size="sm"
                >
                  {endingSession ? (
                    <>Ending...</>
                  ) : (
                    <>
                      <Power className="h-3 w-3 mr-1.5" />
                      End Session
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="flex w-full">
          <TabsTrigger value="live" className="flex-1 text-xs md:text-sm py-1.5">Live</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 text-xs md:text-sm py-1.5">Reports</TabsTrigger>
          <TabsTrigger value="userReports" className="flex-1 text-xs md:text-sm py-1.5">Issues</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 text-xs md:text-sm py-1.5">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="live" className="mt-2 md:mt-4">
          <LiveAttendanceSheet classId={selectedClass.id} />
        </TabsContent>
        
        <TabsContent value="reports" className="mt-2 md:mt-4">
          <Card>
            <CardHeader className="py-3 md:py-4">
              <CardTitle className="text-base md:text-lg">Attendance Reports</CardTitle>
              <CardDescription className="text-xs md:text-sm">View, export, and copy attendance reports</CardDescription>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Button onClick={exportAttendanceToCsv} className="w-full text-xs md:text-sm" size="sm">
                    <Download className="h-3 w-3 mr-1.5" /> Export as CSV
                  </Button>
                </div>
                
                {historyLoading ? (
                  <div className="flex justify-center py-4 md:py-8">
                    <History className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceHistory.length === 0 ? (
                  <p className="text-center py-3 text-xs md:text-sm text-muted-foreground">No attendance records found</p>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    <h3 className="font-medium text-sm md:text-base">Attendance History</h3>
                    
                    <div className="max-h-[45vh] overflow-y-auto pr-1 w-full md:w-[98%] mx-auto">
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
                          <Card key={sessionId} className="mb-3">
                            <CardHeader className="py-2 px-3 md:px-6">
                              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                <div>
                                  <CardTitle className="text-xs md:text-sm">
                                    {sessionDate}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    Present: {presentCount}/{totalCount} ({Math.round((presentCount/totalCount) * 100)}%)
                                  </CardDescription>
                                </div>
                                <div className="flex flex-col md:flex-row gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => copySessionReportToClipboard(sessionId, records)}
                                    className="text-xs w-full md:w-auto py-1"
                                  >
                                    <ClipboardCopy className="h-3 w-3 mr-1" /> Copy
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setDeleteSessionId(sessionId)}
                                    className="text-xs w-full md:w-auto py-1"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1 text-red-500" /> Delete
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="py-1 px-2 md:px-6">
                              <div className="rounded-md border overflow-x-auto">
                                <table className="w-full text-xs md:text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="px-2 md:px-4 py-1.5 md:py-2 text-left font-medium">Name</th>
                                      <th className="px-2 md:px-4 py-1.5 md:py-2 text-left font-medium">Roll No</th>
                                      <th className="px-2 md:px-4 py-1.5 md:py-2 text-left font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {records
                                      .sort((a, b) => {
                                        // Convert roll numbers to strings and handle null/undefined values
                                        const rollA = (a.rollNumber || '').toString();
                                        const rollB = (b.rollNumber || '').toString();
                                        
                                        // First try numeric comparison if both are numbers
                                        const numA = parseInt(rollA);
                                        const numB = parseInt(rollB);
                                        
                                        if (!isNaN(numA) && !isNaN(numB)) {
                                          return numA - numB;
                                        }
                                        
                                        // Fall back to string comparison for non-numeric or mixed roll numbers
                                        return rollA.localeCompare(rollB);
                                      })
                                      .map((record) => (
                                        <tr key={record.id} className="border-b">
                                          <td className="px-2 md:px-4 py-1.5 md:py-2">
                                            <div className="truncate max-w-[120px] md:max-w-none">
                                              {record.userName}
                                            </div>
                                          </td>
                                          <td className="px-2 md:px-4 py-1.5 md:py-2">{record.rollNumber || 'N/A'}</td>
                                          <td className="px-2 md:px-4 py-1.5 md:py-2">
                                            <span className={cn(
                                              "px-1.5 py-0.5 rounded-full text-[10px] md:text-xs",
                                              record.verified 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            )}>
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
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 px-3 md:px-6">
              <Button variant="outline" onClick={fetchAttendanceHistory} size="sm" className="ml-auto text-xs md:text-sm py-1">
                <History className="h-3 w-3 mr-1.5" /> Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="userReports" className="mt-2 md:mt-4">
          <UserReports classId={selectedClass.id} />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-2 md:mt-4">
          <GeolocationSettings />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent className="max-w-[90%] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance session? This action cannot be undone.
              All attendance records associated with this session will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deletingSession} className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingSession}
              onClick={(e) => {
                e.preventDefault();
                if (deleteSessionId) {
                  deleteAttendanceSession(deleteSessionId);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deletingSession ? 'Deleting...' : 'Delete Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPanel;