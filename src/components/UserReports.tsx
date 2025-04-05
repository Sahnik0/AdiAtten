
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
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
import { RefreshCcw, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rollNumber?: string;
  issueDetails: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: Timestamp;
}

const UserReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      const reportsQuery = query(
        collection(firestore, 'reports'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(reportsQuery);
      const reportsList: Report[] = [];
      
      snapshot.forEach(doc => {
        reportsList.push({
          id: doc.id,
          ...doc.data()
        } as Report);
      });
      
      setReports(reportsList);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user reports.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(firestore, 'reports', reportId), { status });
      
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
      case 'dismissed':
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
              View and manage issues reported by users
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchReports}
            className="flex items-center"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
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
                      {report.status === 'pending' && (
                        <div className="flex justify-end gap-2">
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
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
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