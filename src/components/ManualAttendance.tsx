
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface Student {
  id: string;
  displayName: string;
  email: string;
  present: boolean;
}

const ManualAttendance = () => {
  const [course, setCourse] = useState('');
  const [section, setSection] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Query users who are students (not admins)
        const usersQuery = query(
          collection(firestore, 'users'),
          where('isAdmin', '==', false),
          orderBy('displayName')
        );
        
        const snapshot = await getDocs(usersQuery);
        const studentsList: Student[] = [];
        
        snapshot.forEach(doc => {
          const userData = doc.data();
          studentsList.push({
            id: doc.id,
            displayName: userData.displayName || 'Unknown',
            email: userData.email || 'No email',
            present: false,
          });
        });
        
        setStudents(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error",
          description: "Failed to fetch student list.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, []);

  // Toggle student's attendance status
  const toggleStudentPresence = (studentId: string) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId 
          ? { ...student, present: !student.present } 
          : student
      )
    );
  };

  // Mark all students present
  const markAllPresent = () => {
    setStudents(prevStudents => 
      prevStudents.map(student => ({ ...student, present: true }))
    );
  };

  // Mark all students absent
  const markAllAbsent = () => {
    setStudents(prevStudents => 
      prevStudents.map(student => ({ ...student, present: false }))
    );
  };

  // Save manual attendance
  const saveManualAttendance = async () => {
    if (!course || !section) {
      toast({
        title: "Missing Information",
        description: "Please enter course and section.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Format date as YYYY-MM-DD
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      // Create a batch write for all students
      const attendanceId = `manual_${course}_${section}_${dateString}`;
      const manualAttendanceRef = doc(firestore, 'manualAttendance', attendanceId);
      
      await setDoc(manualAttendanceRef, {
        course,
        section,
        date: dateString,
        timestamp: new Date(),
        students: students.map(student => ({
          id: student.id,
          name: student.displayName,
          email: student.email,
          present: student.present,
        })),
      });
      
      toast({
        title: "Success",
        description: "Manual attendance has been saved.",
      });
      
      // Reset form
      setCourse('');
      setSection('');
      setSelectedDate(new Date());
      setStudents(prevStudents => 
        prevStudents.map(student => ({ ...student, present: false }))
      );
      
    } catch (error) {
      console.error("Error saving manual attendance:", error);
      toast({
        title: "Error",
        description: "Failed to save attendance.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Attendance Entry</CardTitle>
        <CardDescription>
          Record attendance for a class session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Class Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Input
              id="course"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g., CS101"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., A"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Student List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Students</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllPresent}
                className="text-green-600 text-xs"
              >
                Mark All Present
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAbsent}
                className="text-red-600 text-xs"
              >
                Mark All Absent
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No students found</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto p-2">
              {students.map(student => (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md",
                    student.present ? "bg-green-50" : "bg-muted"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      checked={student.present}
                      onCheckedChange={() => toggleStudentPresence(student.id)}
                    />
                    <div>
                      <p className="font-medium">{student.displayName}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                  <div className="text-xs font-medium">
                    {student.present ? (
                      <span className="text-green-600">Present</span>
                    ) : (
                      <span className="text-red-600">Absent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full gradient-bg"
          disabled={isSubmitting || loading}
          onClick={saveManualAttendance}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Attendance
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ManualAttendance;
