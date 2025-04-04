
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Shield, User, RefreshCcw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Student {
  id: string;
  email: string;
  displayName?: string | null;
  rollNumber?: string;
  isAdmin: boolean;
  deviceId?: string;
  createdAt?: any;
}

const StudentsList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const studentsQuery = query(collection(firestore, 'users'), orderBy('rollNumber'));
      const snapshot = await getDocs(studentsQuery);
      
      const studentsList: Student[] = [];
      snapshot.forEach(doc => {
        studentsList.push({
          id: doc.id,
          ...doc.data()
        } as Student);
      });
      
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch students list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const toggleAdminStatus = async (studentId: string, isCurrentlyAdmin: boolean) => {
    try {
      await updateDoc(doc(firestore, 'users', studentId), {
        isAdmin: !isCurrentlyAdmin
      });
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, isAdmin: !isCurrentlyAdmin } 
            : student
        )
      );
      
      toast({
        title: "Success",
        description: `Admin privileges ${!isCurrentlyAdmin ? 'granted' : 'revoked'}.`,
      });
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast({
        title: "Error",
        description: "Failed to update admin status.",
        variant: "destructive",
      });
    }
  };

  const resetDevice = async (studentId: string) => {
    try {
      await updateDoc(doc(firestore, 'users', studentId), {
        deviceId: null
      });
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, deviceId: undefined } 
            : student
        )
      );
      
      toast({
        title: "Success",
        description: "Device has been reset. Student can now log in from a new device.",
      });
    } catch (error) {
      console.error("Error resetting device:", error);
      toast({
        title: "Error",
        description: "Failed to reset student's device.",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (student.displayName?.toLowerCase() || '').includes(query) ||
      (student.email?.toLowerCase() || '').includes(query) ||
      (student.rollNumber?.toLowerCase() || '').includes(query)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Enrolled Students</CardTitle>
            <CardDescription>
              View and manage all students registered in the system
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={fetchStudents}
              className="flex items-center"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No students match your search' : 'No students enrolled yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.rollNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {student.displayName || student.email?.split('@')[0] || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{student.email}</TableCell>
                    <TableCell className="text-center">
                      {student.isAdmin ? (
                        <Shield className="h-5 w-5 text-blue-500 inline" />
                      ) : (
                        <User className="h-5 w-5 text-gray-400 inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toggleAdminStatus(student.id, student.isAdmin)}
                        >
                          {student.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resetDevice(student.id)}
                        >
                          Reset Device
                        </Button>
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

export default StudentsList;
