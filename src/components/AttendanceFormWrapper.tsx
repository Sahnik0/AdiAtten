
import React, { useEffect, useState } from 'react';
import AttendanceForm from './AttendanceForm';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Class } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RefreshCcw, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const AttendanceFormWrapper = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeClasses, setActiveClasses] = useState<Class[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch available classes and active classes for the current user
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchClasses = async () => {
      try {
        setLoading(true);
        
        let userClasses: Class[] = [];
        
        if (currentUser.isAdmin) {
          // For admins, fetch all classes or classes they created
          const classesQuery = query(
            collection(firestore, 'classes')
          );
          
          const classesSnapshot = await getDocs(classesQuery);
          userClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
        } else {
          // For students, only show classes they're enrolled in
          const enrolledQuery = query(
            collection(firestore, 'classes'),
            where('students', 'array-contains', currentUser.uid)
          );
          
          const enrolledSnapshot = await getDocs(enrolledQuery);
          userClasses = enrolledSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
        }
        
        setAvailableClasses(userClasses);
        
        // Filter active classes
        const active = userClasses.filter(cls => cls.isActive);
        setActiveClasses(active);
        
        // If there's an active class and no selection yet, select it automatically
        if (active.length > 0 && !selectedClassId) {
          setSelectedClassId(active[0].id);
          setSelectedClass(active[0]);
        }
        
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast({
          title: "Error",
          description: "Failed to fetch classes.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchClasses();
    
    // Poll every 30 seconds for active classes
    const interval = setInterval(fetchClasses, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  // Update selected class when selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      const classObj = availableClasses.find(c => c.id === selectedClassId) || null;
      setSelectedClass(classObj);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, availableClasses]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      // The useEffect will run again to fetch classes
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking Active Classes</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If user is not enrolled in any class (students only)
  if (!currentUser?.isAdmin && availableClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Classes Available</CardTitle>
          <CardDescription>
            You need to be enrolled in a class to mark attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ask your instructor to approve your enrollment in a class.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If no active classes
  if (activeClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Attendance</CardTitle>
          <CardDescription>
            There are no active attendance sessions at the moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {currentUser?.isAdmin 
                ? "Start an attendance session from the Class Management tab."
                : "Wait for your instructor to start an attendance session."}
            </p>
            
            {availableClasses.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md">
                <div className="flex">
                  <AlertCircle className="text-blue-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-700 font-medium">Your Available Classes</p>
                    <ul className="text-sm text-blue-600 mt-2 list-disc pl-5">
                      {availableClasses.map(cls => (
                        <li key={cls.id}>{cls.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>
            Choose a class to mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.isActive ? ' (Active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedClass && selectedClass.isActive && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-md">
                <div className="flex">
                  <Clock className="text-green-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-700 font-medium">
                      Active Attendance: {selectedClass.name}
                    </p>
                    <p className="text-sm text-green-600">
                      {selectedClass.startTime && 
                        `Started at ${new Date(selectedClass.startTime.toDate()).toLocaleTimeString()}`}
                      {selectedClass.endTime && 
                        ` • Ends at ${new Date(selectedClass.endTime.toDate()).toLocaleTimeString()}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Classes
          </Button>
        </CardFooter>
      </Card>
      
      <AttendanceForm selectedClass={selectedClass} />
    </div>
  );
};

export default AttendanceFormWrapper;
