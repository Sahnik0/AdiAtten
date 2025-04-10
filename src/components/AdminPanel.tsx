import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, XCircle, Users, Clock, Download, Settings, 
  RefreshCcw, FilePlus, Database, History, Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GeolocationSettings from './GeolocationSettings';
import EnhancedManualAttendance from './EnhancedManualAttendance';
import StudentsList from './StudentsList';
import { AttendanceRecord, PendingAttendance } from '@/lib/types';

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, PendingAttendance>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const { toast } = useToast();
  
  const fetchAttendanceRecords = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('date', '==', today),
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
      
      setAttendanceRecords(records);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance records.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    const pendingRef = ref(database, 'attendancePending');
    
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      if (snapshot.exists()) {
        setPendingAttendance(snapshot.val());
      } else {
        setPendingAttendance({});
      }
    });
    
    fetchAttendanceRecords();
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  const resetDeviceId = async (userId: string) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        deviceId: null
      });
      
      toast({
        title: "Success",
        description: "Device ID has been reset.",
      });
    } catch (error) {
      console.error("Error resetting device ID:", error);
      toast({
        title: "Error",
        description: "Failed to reset device ID.",
        variant: "destructive",
      });
    }
  };
  
  const updateAttendanceStatus = async (recordId: string, verified: boolean) => {
    try {
      const attendanceRef = doc(firestore, 'attendance', recordId);
      await updateDoc(attendanceRef, { verified });
      
      setAttendanceRecords(prev => 
        prev.map(record => 
          record.id === recordId ? { ...record, verified } : record
        )
      );
      
      const userId = recordId.split('_')[0];
      if (pendingAttendance[userId]) {
        const pendingRef = ref(database, `attendancePending/${userId}`);
        await deleteDoc(doc(firestore, `attendancePending/${userId}`));
      }
      
      toast({
        title: "Success",
        description: `Attendance ${verified ? 'verified' : 'denied'}.`,
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
  
  const exportToCsv = () => {
    const today = new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    const headers = ["Name", "Roll Number", "Email", "Class", "Time", "Status"];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    attendanceRecords.forEach(record => {
      const timestamp = record.timestamp?.toDate 
        ? record.timestamp.toDate().toLocaleTimeString() 
        : 'Pending';
        
      const row = [
        `"${record.userName || 'Unknown'}"`,
        `"${record.rollNumber || 'N/A'}"`,
        `"${record.userEmail || 'Unknown'}"`,
        `"${record.classId || 'N/A'}"`,
        `"${timestamp}"`,
        `"${record.verified ? 'Present' : 'Pending'}"`,
      ];
      
      csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${today.replace(/\s/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportAsText = () => {
    const present = attendanceRecords.filter(r => r.verified).map(r => `${r.userName || r.userEmail} (${r.rollNumber || 'N/A'})`);
    const absent = attendanceRecords.filter(r => !r.verified).map(r => `${r.userName || r.userEmail} (${r.rollNumber || 'N/A'})`);
    
    const message = `Attendance Report (${new Date().toLocaleDateString()})\n\nPresent: ${present.join(', ') || 'None'}\n\nAbsent: ${absent.join(', ') || 'None'}`;
    
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Attendance text has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    });
  };

  if (!currentUser?.isAdmin) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-6 px-2 sm:px-4">
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <CardTitle className="text-lg sm:text-2xl font-bold">Admin Dashboard</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage attendance records and campus settings</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAttendanceRecords}
              className="flex items-center text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
            >
              <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-9 sm:h-10 text-xs sm:text-sm">
          <TabsTrigger value="live" className="flex items-center">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Live</span> View
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center">
            <FilePlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Manual</span> Entry
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> 
            <span className="hidden xs:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Export</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Live Attendance Status</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Real-time attendance updates for today
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
              {loading ? (
                <div className="flex justify-center py-4 sm:py-8">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium mb-2">Pending Verification</h3>
                    {Object.keys(pendingAttendance).length === 0 ? (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No pending attendance requests</p>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(pendingAttendance).map(([userId, data]) => {
                          const record = attendanceRecords.find(r => r.userId === userId);
                          
                          if (record) return null;
                          
                          return (
                            <div key={userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-4 bg-muted rounded-md gap-2 sm:gap-0">
                              <div>
                                <p className="font-medium text-sm sm:text-base">{data.name}</p>
                                <p className="text-xs sm:text-sm">{data.rollNumber || 'N/A'}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">{data.email}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {new Date(data.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-green-600 h-7 sm:h-8 text-[10px] sm:text-xs"
                                  onClick={() => updateAttendanceStatus(`${userId}_${data.date}`, true)}
                                >
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Present
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 h-7 sm:h-8 text-[10px] sm:text-xs"
                                  onClick={() => updateAttendanceStatus(`${userId}_${data.date}`, false)}
                                >
                                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Absent
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => resetDeviceId(userId)}
                                  title="Reset Device ID"
                                  className="h-7 sm:h-8"
                                >
                                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-base sm:text-lg font-medium mb-2">Today's Records</h3>
                    {attendanceRecords.length === 0 ? (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No attendance records for today</p>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {attendanceRecords.map(record => (
                          <div 
                            key={record.id} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-4 rounded-md gap-2 sm:gap-0 ${
                              record.verified 
                                ? 'bg-green-50 border border-green-100' 
                                : 'bg-amber-50 border border-amber-100'
                            }`}
                          >
                            <div>
                              <p className="font-medium text-sm sm:text-base">{record.userName}</p>
                              <p className="text-xs sm:text-sm">{record.rollNumber || 'N/A'}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">{record.userEmail}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {record.timestamp?.toDate 
                                  ? record.timestamp.toDate().toLocaleTimeString() 
                                  : 'Pending'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant={record.verified ? "default" : "outline"}
                                className={`${record.verified ? "bg-green-600" : "text-green-600"} h-7 sm:h-8 text-[10px] sm:text-xs`}
                                onClick={() => updateAttendanceStatus(record.id, true)}
                              >
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Present
                              </Button>
                              <Button 
                                size="sm" 
                                variant={!record.verified ? "default" : "outline"}
                                className={`${!record.verified ? "bg-red-600" : "text-red-600"} h-7 sm:h-8 text-[10px] sm:text-xs`}
                                onClick={() => updateAttendanceStatus(record.id, false)}
                              >
                                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Absent
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => resetDeviceId(record.userId)}
                                title="Reset Device ID"
                                className="h-7 sm:h-8"
                              >
                                <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <EnhancedManualAttendance />
        </TabsContent>

        <TabsContent value="students">
          <StudentsList />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Attendance History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View past attendance records
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 py-2 sm:py-4">
              <div className="flex flex-col sm:flex-row items-center justify-center py-4 sm:py-8 gap-3 sm:gap-4 text-center sm:text-left">
                <Database className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-base sm:text-lg font-medium">Attendance Records</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    The complete history feature will be available soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-base sm:text-lg">Export Attendance Data</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Download attendance records in various formats
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 py-2 sm:py-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <Button 
                  onClick={exportToCsv}
                  className="w-full flex items-center justify-center h-16 sm:h-20"
                >
                  <Download className="h-4 w-4 sm:h-6 sm:w-6 mr-1 sm:mr-2" />
                  <div>
                    <div className="font-medium text-sm sm:text-base">Export as CSV</div>
                    <div className="text-[10px] sm:text-xs">For spreadsheets & databases</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={exportAsText}
                  className="w-full flex items-center justify-center h-16 sm:h-20"
                >
                  <Download className="h-4 w-4 sm:h-6 sm:w-6 mr-1 sm:mr-2" />
                  <div>
                    <div className="font-medium text-sm sm:text-base">Copy as Text</div>
                    <div className="text-[10px] sm:text-xs">For messages & emails</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <GeolocationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;