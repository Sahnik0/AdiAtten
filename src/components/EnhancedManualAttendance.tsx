
import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import AttendanceClassInfo, { ClassInfo } from './AttendanceClassInfo';
import { Download } from 'lucide-react';

interface Student {
  id: string;
  displayName: string;
  rollNumber: string;
  email: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  present: boolean;
  course: string;
  section: string;
  date: string;
  time: string;
  timestamp: Date;
}

const EnhancedManualAttendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const usersRef = collection(firestore, "users");
      const q = query(
        usersRef,
        orderBy("rollNumber", "asc")
      );

      const snapshot = await getDocs(q);
      const studentsList: Student[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter out admin users
        if (!data.isAdmin && data.email.endsWith('@stu.adamasuniversity.ac.in')) {
          studentsList.push({
            id: doc.id,
            displayName: data.displayName || 'Unknown',
            rollNumber: data.rollNumber || 'N/A',
            email: data.email,
          });
        }
      });

      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch student list",
        variant: "destructive",
      });
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    students.forEach(student => {
      newSelected[student.id] = checked;
    });
    setSelectedStudents(newSelected);
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleClassInfoSave = (info: ClassInfo) => {
    setClassInfo(info);
  };

  const submitAttendance = async () => {
    if (!classInfo) {
      toast({
        title: "Missing Information",
        description: "Please fill in class information first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = [];
      const attendanceDate = new Date(`${classInfo.date}T${classInfo.time}`);
      
      for (const student of students) {
        const present = selectedStudents[student.id] || false;
        
        // Prepare attendance record
        const record: AttendanceRecord = {
          studentId: student.id,
          studentName: student.displayName,
          studentEmail: student.email,
          rollNumber: student.rollNumber,
          present,
          course: classInfo.course,
          section: classInfo.section,
          date: classInfo.date,
          time: classInfo.time,
          timestamp: attendanceDate
        };
        
        // Add to attendance collection
        batch.push(addDoc(collection(firestore, "attendance"), record));
      }
      
      await Promise.all(batch);
      
      toast({
        title: "Success",
        description: `Attendance recorded for ${classInfo.course} - ${classInfo.section}`,
      });
      
      setSelectedStudents({});
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to submit attendance",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const generateAttendanceText = () => {
    if (!classInfo) return "";
    
    const presentStudents = students
      .filter(student => selectedStudents[student.id])
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
      
    const absentStudents = students
      .filter(student => !selectedStudents[student.id])
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    
    // Format the text report
    let report = `ATTENDANCE REPORT\n`;
    report += `====================\n\n`;
    report += `Course: ${classInfo.course}\n`;
    report += `Section: ${classInfo.section}\n`;
    report += `Date: ${classInfo.date}\n`;
    report += `Time: ${classInfo.time}\n\n`;
    report += `PRESENT STUDENTS (${presentStudents.length}):\n`;
    report += `------------------------\n`;
    
    presentStudents.forEach((student, index) => {
      report += `${index + 1}. ${student.displayName} (${student.rollNumber})\n`;
    });
    
    report += `\nABSENT STUDENTS (${absentStudents.length}):\n`;
    report += `------------------------\n`;
    
    absentStudents.forEach((student, index) => {
      report += `${index + 1}. ${student.displayName} (${student.rollNumber})\n`;
    });
    
    report += `\n====================\n`;
    report += `Total Students: ${students.length}\n`;
    report += `Present: ${presentStudents.length}\n`;
    report += `Absent: ${absentStudents.length}\n`;
    
    return report;
  };
  
  const downloadAttendanceReport = () => {
    if (!classInfo) {
      toast({
        title: "Missing Information",
        description: "Please fill in class information first.",
        variant: "destructive",
      });
      return;
    }
    
    const report = generateAttendanceText();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Format filename
    const courseName = classInfo.course.replace(/\s+/g, '_').toLowerCase();
    const date = classInfo.date.replace(/-/g, '');
    const fileName = `attendance_${courseName}_${date}.txt`;
    
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: "Attendance report downloaded",
    });
  };

  return (
    <div className="space-y-6">
      <AttendanceClassInfo onSave={handleClassInfoSave} />
      
      {classInfo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mark Attendance</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadAttendanceReport}
              disabled={!classInfo}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        onCheckedChange={(checked) => toggleSelectAll(!!checked)} 
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedStudents[student.id] || false}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                        </TableCell>
                        <TableCell>{student.displayName}</TableCell>
                        <TableCell>{student.rollNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{student.email}</TableCell>
                        <TableCell>
                          {selectedStudents[student.id] ? (
                            <span className="text-green-600 font-medium">Present</span>
                          ) : (
                            <span className="text-red-600 font-medium">Absent</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => toggleSelectAll(true)}
              >
                Select All
              </Button>
              
              <Button 
                onClick={submitAttendance}
                disabled={isSubmitting || !classInfo}
              >
                {isSubmitting ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedManualAttendance;
