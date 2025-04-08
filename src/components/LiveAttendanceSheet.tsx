
import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database, firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, UserCheck } from 'lucide-react';
import { PendingAttendance } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface LiveAttendanceSheetProps {
  classId: string;
}

const LiveAttendanceSheet: React.FC<LiveAttendanceSheetProps> = ({ classId }) => {
  const [liveAttendance, setLiveAttendance] = useState<PendingAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    setLoading(true);
    // The actual data refresh is handled by the listeners
    setTimeout(() => setLoading(false), 500); // Just show loading indicator briefly
  }, []);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      setLiveAttendance([]);
      return;
    }

    setLoading(true);
    
    // Reference to the pending attendance for this class
    const attendanceRef = ref(database, `attendancePending/${classId}`);
    
    // Listen for real-time updates from Realtime Database
    const pendingAttendanceListener = onValue(attendanceRef, (snapshot) => {
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
    }, (error) => {
      console.error('Error loading live attendance:', error);
      setLoading(false);
    });
    
    // Set up real-time listener for class status changes in Firestore
    const classDocRef = doc(firestore, 'classes', classId);
    const classStatusListener = onSnapshot(classDocRef, (doc) => {
      if (doc.exists()) {
        const classData = doc.data();
        setIsSessionActive(classData.isActive === true);
      } else {
        setIsSessionActive(false);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error in class status listener:', error);
      setLoading(false);
    });
    
    // Cleanup listeners on unmount
    return () => {
      off(attendanceRef);
      classStatusListener();
    };
  }, [classId]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" /> 
              {isSessionActive ? "Live Attendance" : "Attendance Session Ended"}
            </CardTitle>
            <CardDescription>
              {isSessionActive 
                ? `Showing ${liveAttendance.length} attendance records` 
                : "There is no active attendance session"}
            </CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isSessionActive ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Attendance has been recorded. Check reports for details.</p>
          </div>
        ) : liveAttendance.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No attendance records yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveAttendance.map((record) => (
                <TableRow key={record.userId}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.rollNumber || 'N/A'}</TableCell>
                  <TableCell>{record.email}</TableCell>
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
        )}
      </CardContent>
    </Card>
  );
};

export default LiveAttendanceSheet;