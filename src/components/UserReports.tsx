
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, Timestamp, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Check, X, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserReport } from '@/lib/types';

interface UserReportsProps {
  classId?: string;
  sessionId?: string;
}

const UserReports: React.FC<UserReportsProps> = ({ classId, sessionId }) => {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [silentlyRefreshing, setSilentlyRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setSilentlyRefreshing(true);
      
      // Build query based on whether classId and sessionId are provided
      // Avoid using multiple orderBy clauses that would require a composite index
      let reportsQuery;
      
      if (classId && sessionId) {
        // For specific class and session
        reportsQuery = query(
          collection(firestore, 'reports'),
          where('classId', '==', classId),
          where('sessionId', '==', sessionId),
          limit(50) // Adding limit to prevent excessive data fetching
        );
      } else if (classId) {
        // For specific class only
        reportsQuery = query(
          collection(firestore, 'reports'),
          where('classId', '==', classId),
          limit(50)
        );
      } else {
        // Fetch all reports with limited amount
        reportsQuery = query(
          collection(firestore, 'reports'),
          limit(50)
        );
      }
      
      const snapshot = await getDocs(reportsQuery);
      const reportsList: UserReport[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as UserReport;
        reportsList.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rollNumber: data.rollNumber || '',
          issueDetails: data.issueDetails,
          status: data.status || 'pending',
          timestamp: data.timestamp,
          classId: data.classId,
          response: data.response || '',
          responseTimestamp: data.responseTimestamp,
          respondedBy: data.respondedBy || '',
          sessionId: data.sessionId || ''
        });
      });
      
      // Client-side sorting instead of using orderBy in query
      reportsList.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() 
          ? a.timestamp.toDate().getTime() 
          : 0;
        const timeB = b.timestamp?.toDate?.() 
          ? b.timestamp.toDate().getTime() 
          : 0;
        return timeB - timeA; // Sort by timestamp descending
      });
      
      setReports(reportsList);
    } catch (error) {
      console.error("Error fetching reports:", error);
      if (!silentlyRefreshing) {
        toast({
          title: "Error",
          description: "Failed to fetch user reports.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setSilentlyRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
    
    // Set up a timer to refresh reports every 30 seconds silently
    const intervalId = setInterval(() => {
      setSilentlyRefreshing(true);
      fetchReports();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [classId, sessionId]);

  const updateReportStatus = async (reportId: string, status: 'resolved' | 'rejected') => {
    try {
      await updateDoc(doc(firestore, 'reports', reportId), { 
        status,
        responseTimestamp: Timestamp.now() 
      });
      
      // Update local state
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId ? { ...report, status } : report
        )
      );
      
      toast({
        title: "Success",
        description: `Report marked as ${status}.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    }
  };

  const copyReportDetails = (report: UserReport) => {
    const reportText = `
Student: ${report.userName} (${report.userEmail})
${report.rollNumber ? `Roll Number: ${report.rollNumber}` : ''}
Reported Issue: ${report.issueDetails}
Date: ${report.timestamp?.toDate 
  ? report.timestamp.toDate().toLocaleString() 
  : 'Unknown'}
Status: ${report.status}
    `.trim();
    
    navigator.clipboard.writeText(reportText).then(() => {
      toast({
        title: "Copied",
        description: "Report details copied to clipboard.",
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: "Error",
        description: "Failed to copy report details.",
        variant: "destructive",
      });
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Reported Issues</CardTitle>
            <CardDescription>
              {classId && sessionId 
                ? "View and manage issues reported for this session" 
                : classId 
                  ? "View and manage issues reported for this class" 
                  : "View and manage all reported issues"}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setLoading(true);
              fetchReports();
            }}
            className="flex items-center"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${silentlyRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !silentlyRefreshing ? (
          <div className="flex justify-center py-8">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reports submitted by users
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Issue Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.userName}</p>
                        <p className="text-sm text-muted-foreground">{report.userEmail}</p>
                        {report.rollNumber && (
                          <p className="text-sm text-muted-foreground">Roll: {report.rollNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-pre-wrap">{report.issueDetails}</p>
                    </TableCell>
                    <TableCell>
                      {report.timestamp?.toDate 
                        ? report.timestamp.toDate().toLocaleString() 
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(report.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyReportDetails(report)}
                          title="Copy report details"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        
                        {report.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600"
                              onClick={() => updateReportStatus(report.id, 'resolved')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600"
                              onClick={() => updateReportStatus(report.id, 'rejected')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserReports;