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
import { Download, History, ClipboardCopy, Settings, RefreshCcw, Power, Play, Search, X, Plus, Edit as EditIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeolocationSettings from '@/components/GeolocationSettings';
import { ref, remove, get } from 'firebase/database';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [sessionSearchQueries, setSessionSearchQueries] = useState<Record<string, string>>({});
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [allClassStudents, setAllClassStudents] = useState<{ id: string, email: string, name: string, rollNumber: string }[]>([]);
  const [studentToAdd, setStudentToAdd] = useState<string>('');
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
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

  const fetchClassStudents = async () => {
    if (!selectedClass?.id) return;

    try {
      const enrolledQuery = query(
        collection(firestore, 'users'),
        where('enrolledClasses', 'array-contains', selectedClass.id)
      );

      const querySnapshot = await getDocs(enrolledQuery);
      const students: any[] = [];

      querySnapshot.forEach(doc => {
        const userData = doc.data();
        students.push({
          id: doc.id,
          email: userData.email || '',
          name: userData.displayName || userData.email || '',
          rollNumber: userData.rollNumber || ''
        });
      });

      students.sort((a, b) => {
        if (!a.rollNumber) return 1;
        if (!b.rollNumber) return -1;
        return a.rollNumber.localeCompare(b.rollNumber);
      });

      setAllClassStudents(students);
    } catch (error) {
      console.error("Error fetching class students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch student list.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedClass?.id) {
      fetchClassStudents();
    }
  }, [selectedClass]);

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

  const toggleAttendanceStatus = async (record: AttendanceRecord) => {
    try {
      await updateDoc(doc(firestore, 'attendance', record.id), {
        verified: !record.verified
      });

      setAttendanceHistory(prev =>
        prev.map(r => r.id === record.id ? { ...r, verified: !r.verified } : r)
      );

      toast({
        title: "Attendance Updated",
        description: `${record.userName} marked as ${!record.verified ? 'present' : 'absent'}.`,
      });
    } catch (error) {
      console.error("Error updating attendance status:", error);
      toast({
        title: "Error",
        description: "Failed to update attendance status.",
        variant: "destructive",
      });
    }
  };

  const addStudentToAttendance = async () => {
    if (!studentToAdd || !currentSessionId) return;

    try {
      const student = allClassStudents.find(s => s.id === studentToAdd);
      if (!student) return;

      const attendanceId = `${student.id}_${selectedClass.id}_${currentSessionId}`;

      const recordRef = doc(firestore, 'attendance', attendanceId);
      const recordDoc = await getDoc(recordRef);

      if (recordDoc.exists()) {
        toast({
          title: "Student Already Added",
          description: "This student already has an attendance record for this session.",
        });
        return;
      }

      await setDoc(recordRef, {
        userId: student.id,
        userEmail: student.email,
        userName: student.name,
        rollNumber: student.rollNumber || '',
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0],
        verified: true,
        classId: selectedClass.id,
        sessionId: currentSessionId,
        manuallyAdded: true
      });

      fetchAttendanceHistory();

      toast({
        title: "Student Added",
        description: `${student.name} was successfully added to attendance.`,
      });

      setAddStudentDialogOpen(false);
      setStudentToAdd('');
    } catch (error) {
      console.error("Error adding student to attendance:", error);
      toast({
        title: "Error",
        description: "Failed to add student to attendance.",
        variant: "destructive",
      });
    }
  };

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
        description: "Failed to start attendance session.",
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

      // Process pending attendance first
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

      // Mark absent students
      const enrolledQuery = query(
        collection(firestore, 'users'),
        where('enrolledClasses', 'array-contains', selectedClass.id)
      );

      const enrolledSnapshot = await getDocs(enrolledQuery);
      const enrolledStudents: any[] = [];

      enrolledSnapshot.forEach(doc => {
        enrolledStudents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Create attendance records for absent students
      for (const student of enrolledStudents) {
        if (pendingData[student.id]) continue; // Skip if already marked present

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

      // Update class status
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

    // Group records by session
    const sessionGroups: Record<string, AttendanceRecord[]> = {};
    attendanceHistory.forEach(record => {
      const sessionId = record.sessionId || 'unknown';
      if (!sessionGroups[sessionId]) {
        sessionGroups[sessionId] = [];
      }
      sessionGroups[sessionId].push(record);
    });

    const headers = ["Session", "Name", "Roll Number", "Email", "Date", "Time", "Status"];
    const csvRows = [headers.join(',')];

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

  const generateAttendanceReportForSession = async (sessionId: string, records: AttendanceRecord[]) => {
    if (records.length === 0) return "";
    
    try {
      const sessionDate = records[0]?.date || 'Unknown date';
      
      // Get all students enrolled in the class
      const enrolledStudents = [...allClassStudents];  // Use the already fetched class students
      
      // Create a map of students who have attendance records
      const recordsByUserId: Record<string, AttendanceRecord> = {};
      records.forEach(record => {
        if (record.userId) {
          recordsByUserId[record.userId] = record;
        }
      });
      
      // Sort function for students
      const sortByRollNumber = (a: any, b: any) => {
        const rollA = a.rollNumber || '999999';
        const rollB = b.rollNumber || '999999';
        
        if (!isNaN(Number(rollA)) && !isNaN(Number(rollB))) {
          return Number(rollA) - Number(rollB);
        }
        
        return rollA.localeCompare(rollB);
      };
      
      // Divide students into present and absent
      const presentStudents = enrolledStudents
        .filter(student => {
          const record = recordsByUserId[student.id];
          return record && record.verified;
        })
        .sort(sortByRollNumber);
        
      const absentStudents = enrolledStudents
        .filter(student => {
          const record = recordsByUserId[student.id];
          return !record || !record.verified;
        })
        .sort(sortByRollNumber);
      
      let report = `ATTENDANCE REPORT - ${selectedClass.name}\n`;
      report += `====================\n\n`;
      report += `Session: ${sessionId}\n`;
      report += `Date: ${sessionDate}\n`;
      report += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
      
      report += `PRESENT STUDENTS (${presentStudents.length}):\n`;
      report += `------------------------\n`;
      
      presentStudents.forEach((student, index) => {
        report += `${index + 1}. ${student.name} (${student.rollNumber || 'N/A'})\n`;
      });
      
      report += `\nABSENT STUDENTS (${absentStudents.length}):\n`;
      report += `------------------------\n`;
      
      absentStudents.forEach((student, index) => {
        report += `${index + 1}. ${student.name} (${student.rollNumber || 'N/A'})\n`;
      });
      
      report += `\nSESSION SUMMARY:\n`;
      report += `Total Students: ${enrolledStudents.length}\n`;
      report += `Present: ${presentStudents.length}\n`;
      report += `Absent: ${absentStudents.length}\n`;
      report += `Attendance Rate: ${Math.round((presentStudents.length / enrolledStudents.length) * 100)}%\n`;
      
      return report;
    } catch (error) {
      console.error("Error generating attendance report:", error);
      return "Error generating report. Please try again.";
    }
  };

  const copySessionReportToClipboard = async (sessionId: string, records: AttendanceRecord[]) => {
    try {
      const report = await generateAttendanceReportForSession(sessionId, records);
      
      if (!report) {
        toast({
          title: "Error",
          description: "Could not generate report",
          variant: "destructive",
        });
        return;
      }
      
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
    } catch (error) {
      console.error("Error preparing report:", error);
      toast({
        title: "Error",
        description: "Failed to prepare attendance report",
        variant: "destructive",
      });
    }
  };

  const updateSessionSearch = (sessionId: string, query: string) => {
    setSessionSearchQueries(prev => ({
      ...prev,
      [sessionId]: query
    }));
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
    <div className="space-y-3 sm:space-y-6">
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Admin Dashboard for {selectedClass.name}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage attendance and students for {selectedClass.name}</CardDescription>
        </CardHeader>
        <CardContent className="px-3 py-2 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <p className="text-sm sm:text-base">Use the tabs below to manage attendance and view reports for this class.</p>
            <div className="flex space-x-2 flex-wrap gap-2 w-full sm:w-auto">
              {!isActive ? (
                <Button
                  onClick={startAttendanceSession}
                  variant="default"
                  disabled={startingSession}
                  className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-10 w-full sm:w-auto"
                >
                  {startingSession ? (
                    <>Starting...</>
                  ) : (
                    <>
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Start</span> Attendance Session
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={endAttendanceSession}
                  variant="destructive"
                  disabled={endingSession}
                  className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-10 w-full sm:w-auto"
                >
                  {endingSession ? (
                    <>Ending Session...</>
                  ) : (
                    <>
                      <Power className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">End</span> Attendance Session
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-8 sm:h-10">
          <TabsTrigger value="live" className="text-xs sm:text-sm">Live</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          <TabsTrigger value="userReports" className="text-xs sm:text-sm">Issues</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <LiveAttendanceSheet classId={selectedClass.id} />
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-lg sm:text-xl">Attendance Reports</CardTitle>
              <CardDescription className="text-xs sm:text-sm">View, export, and copy attendance reports for this class.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 py-2 sm:p-6">
              <div className="space-y-3 sm:space-y-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <Button onClick={exportAttendanceToCsv} className="w-full text-xs sm:text-sm h-8 sm:h-10">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Export all as CSV
                  </Button>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-4 sm:py-8">
                    <History className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceHistory.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm sm:text-base">No attendance records found for this class.</p>
                ) : (
                  <div className="space-y-2 sm:space-y-4">
                    <h3 className="font-medium text-base sm:text-lg">Attendance History</h3>

                    <div className="max-h-[500px] sm:max-h-[700px] overflow-y-auto pr-1 sm:pr-2 pb-1 sm:pb-2 custom-scrollbar">
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
                          const searchQuery = sessionSearchQueries[sessionId] || '';

                          const filteredRecords = searchQuery
                            ? records.filter(r =>
                              r.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              r.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              r.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            : records;

                          return (
                            <Card key={sessionId} className="mb-2 sm:mb-4">
                              <CardHeader className="pb-1 sm:pb-2 px-2 sm:px-4 pt-2 sm:pt-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                  <div>
                                    <CardTitle className="text-sm sm:text-base">
                                      Session: {sessionDate}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                      Present: {presentCount}/{totalCount} ({Math.round((presentCount / totalCount) * 100)}%)
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copySessionReportToClipboard(sessionId, records)}
                                      className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                                    >
                                      <ClipboardCopy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
                                      <span className="hidden xs:inline">Copy</span> Report
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setCurrentSessionId(sessionId);
                                        setAddStudentDialogOpen(true);
                                      }}
                                      className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                                    >
                                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
                                      <span className="hidden xs:inline">Add</span> Student
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="px-2 sm:px-4 py-1 sm:py-2">
                                <div className="mb-1 sm:mb-2">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Search by name or roll number..."
                                      className="pl-7 sm:pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                                      value={sessionSearchQueries[sessionId] || ''}
                                      onChange={(e) => updateSessionSearch(sessionId, e.target.value)}
                                    />
                                    {searchQuery && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-2 sm:px-3"
                                        onClick={() => updateSessionSearch(sessionId, '')}
                                      >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  {searchQuery && (
                                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                      Found {filteredRecords.length} of {records.length} students
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-md border">
                                  <div className="max-h-[150px] sm:max-h-[200px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-xs sm:text-sm">
                                      <thead className="sticky top-0 bg-background z-10">
                                        <tr className="border-b bg-muted/50">
                                          <th className="px-2 sm:px-4 py-1 sm:py-2 text-left font-medium">Name</th>
                                          <th className="px-2 sm:px-4 py-1 sm:py-2 text-left font-medium">Roll Number</th>
                                          <th className="px-2 sm:px-4 py-1 sm:py-2 text-left font-medium">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredRecords.length > 0 ? (
                                          [...filteredRecords]
                                            .sort((a, b) => {
                                              const rollA = a.rollNumber || '999999';
                                              const rollB = b.rollNumber || '999999';

                                              if (!isNaN(Number(rollA)) && !isNaN(Number(rollB))) {
                                                return Number(rollA) - Number(rollB);
                                              }

                                              return rollA.localeCompare(rollB);
                                            })
                                            .map((record) => (
                                              <tr key={record.id} className="border-b">
                                                <td className="px-2 sm:px-4 py-1 sm:py-2 max-w-[100px] sm:max-w-none truncate">{record.userName}</td>
                                                <td className="px-2 sm:px-4 py-1 sm:py-2">{record.rollNumber || 'N/A'}</td>
                                                <td className="px-2 sm:px-4 py-1 sm:py-2 flex items-center justify-between">
                                                  <span className={`px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs ${
                                                    record.verified
                                                      ? 'bg-green-100 text-green-800'
                                                      : 'bg-red-100 text-red-800'
                                                  }`}>
                                                    {record.verified ? 'Present' : 'Absent'}
                                                  </span>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 ml-1 sm:ml-2"
                                                    onClick={() => toggleAttendanceStatus(record)}
                                                  >
                                                    <EditIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                  </Button>
                                                </td>
                                              </tr>
                                            ))
                                        ) : (
                                          <tr>
                                            <td colSpan={3} className="px-2 sm:px-4 py-2 sm:py-4 text-center text-muted-foreground text-xs sm:text-sm">
                                              No students match your search
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
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
            <CardFooter className="px-3 py-2 sm:p-6">
              <Button 
                variant="outline" 
                onClick={fetchAttendanceHistory} 
                size="sm" 
                className="ml-auto text-xs sm:text-sm h-7 sm:h-9"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Refresh Data
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

      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Add Student to Attendance</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a student who was unable to mark their attendance for this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="student-select" className="text-sm sm:text-base">Select Student</Label>
              <Select value={studentToAdd} onValueChange={setStudentToAdd}>
                <SelectTrigger id="student-select" className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {allClassStudents
                    .filter(student => {
                      const existingRecord = attendanceHistory.find(record =>
                        record.userId === student.id && record.sessionId === currentSessionId
                      );
                      return !existingRecord;
                    })
                    .map(student => (
                      <SelectItem key={student.id} value={student.id} className="text-xs sm:text-sm">
                        {student.name} ({student.rollNumber || 'No Roll'}) - {student.email}
                      </SelectItem>
                    ))}
                  {allClassStudents.length === 0 && (
                    <SelectItem value="none" disabled className="text-xs sm:text-sm">No students available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => setAddStudentDialogOpen(false)} 
              className="text-xs sm:text-sm h-7 sm:h-9"
            >
              Cancel
            </Button>
            <Button 
              onClick={addStudentToAttendance} 
              disabled={!studentToAdd}
              className="text-xs sm:text-sm h-7 sm:h-9"
            >
              Add to Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;