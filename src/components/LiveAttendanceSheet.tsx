
import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { database, firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, UserCheck } from 'lucide-react';
import { PendingAttendance } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface LiveAttendanceSheetProps {
  classId: string;
}

const LiveAttendanceSheet: React.FC<LiveAttendanceSheetProps> = ({ classId }) => {
  const [liveAttendance, setLiveAttendance] = useState<PendingAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const checkClassActive = useCallback(async () => {
    try {
      if (!classId) {
        setIsSessionActive(false);
        return;
      }
      
      // Get real-time class status directly from Firestore
      const classDoc = await getDoc(doc(firestore, 'classes', classId));
      
      if (classDoc.exists()) {
        const classData = classDoc.data();
        setIsSessionActive(classData.isActive === true);
      } else {
        setIsSessionActive(false);
      }
    } catch (error) {
      console.error('Error checking class status:', error);
      setIsSessionActive(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      setLiveAttendance([]);
      return;
    }

    setLoading(true);
    
    // Check if class is active
    checkClassActive();
    
    // Reference to the pending attendance for this class
    const attendanceRef = ref(database, `attendancePending/${classId}`);
    
    // Listen for real-time updates
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      const attendanceList: PendingAttendance[] = [];
      
      if (data) {
        Object.keys(data).forEach((userId) => {
          attendanceList.push({
            userId,
            ...data[userId]
          });
        });
      }
      
      // Sort by timestamp, newest first
      attendanceList.sort((a, b) => b.timestamp - a.timestamp);
      
      setLiveAttendance(attendanceList);
      setLoading(false);
      
      // Recheck class status when attendance data changes
      checkClassActive();
    }, (error) => {
      console.error('Error loading live attendance:', error);
      setLoading(false);
    });
    
    // Set up polling to check class status every 10 seconds
    const intervalId = setInterval(checkClassActive, 10000);
    
    // Cleanup listener and interval on unmount
    return () => {
      off(attendanceRef);
      clearInterval(intervalId);
    };
  }, [classId, checkClassActive]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Live Attendance</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!classId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Class Selected</CardTitle>
          <CardDescription>Please select a class to view attendance.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isSessionActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5" /> Attendance Session Ended
          </CardTitle>
          <CardDescription>There is no active attendance session</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Attendance has been recorded. Check reports for details.</p>
        </CardContent>
      </Card>
    );
  }

  if (liveAttendance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5" /> Live Attendance
          </CardTitle>
          <CardDescription>Real-time attendance updates will appear here</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No attendance records yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCheck className="mr-2 h-5 w-5" /> Live Attendance
        </CardTitle>
        <CardDescription>
          Showing {liveAttendance.length} attendance records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liveAttendance.map((record) => (
              <TableRow key={record.userId}>
                <TableCell className="font-medium">{record.name}</TableCell>
                <TableCell>{record.rollNumber || 'N/A'}</TableCell>
                <TableCell>{new Date(record.timestamp).toLocaleTimeString()}</TableCell>
                <TableCell>
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    Pending
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LiveAttendanceSheet;