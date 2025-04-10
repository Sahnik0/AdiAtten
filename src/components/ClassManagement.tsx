import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Class } from '@/lib/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, Plus, RefreshCcw, Users, Lock, Check, X, Search, Smartphone, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClassManagementProps {
  onClassSelect?: (classObj: Class) => void;
}

const ClassManagement: React.FC<ClassManagementProps> = ({ onClassSelect }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [pendingClasses, setPendingClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminAccessPassword, setAdminAccessPassword] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedAdminClass, setSelectedAdminClass] = useState<Class | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, any>>({});
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  
  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [newClassPassword, setNewClassPassword] = useState('');
  const [joinClassId, setJoinClassId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [activeClass, setActiveClass] = useState<Class | null>(null);
  const [activeClassDuration, setActiveClassDuration] = useState<number>(60); // default 60 minutes
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [startAttendanceOpen, setStartAttendanceOpen] = useState(false);

  // Fix for the DialogTrigger outside of Dialog context in the admin view
  const [startAttendanceDialogOpen, setStartAttendanceDialogOpen] = useState(false);
  const [classIdToStartAttendance, setClassIdToStartAttendance] = useState<string>('');

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classIdToDelete, setClassIdToDelete] = useState<string>('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Check local storage for previously selected class
  useEffect(() => {
    if (currentUser?.isAdmin) {
      const storedClassId = localStorage.getItem('selectedAdminClassId');
      if (storedClassId) {
        setSelectedClassId(storedClassId);
      }
    }
  }, [currentUser]);

  // Fetch user details
  const fetchUserDetails = async (userIds: string[]) => {
    if (!userIds.length) return;
    
    try {
      const uniqueIds = [...new Set(userIds)]; // Remove duplicates
      const userDetailsMap: Record<string, any> = {};
      
      // Fetch user details in batches to avoid too many parallel requests
      const batchSize = 10;
      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize);
        const promises = batch.map(userId => 
          getDoc(doc(firestore, 'users', userId))
            .then(doc => {
              if (doc.exists()) {
                userDetailsMap[userId] = doc.data();
              } else {
                userDetailsMap[userId] = { email: 'Unknown email' };
              }
            })
        );
        
        await Promise.all(promises);
      }
      
      setUserDetails(userDetailsMap);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // Fetch all classes
  const fetchClasses = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      // Fetch all classes for display to students
      const allClassesQuery = query(
        collection(firestore, 'classes'),
        orderBy('name', 'asc')
      );
      
      const allClassesSnapshot = await getDocs(allClassesQuery);
      const fetchedAllClasses: Class[] = [];
      
      allClassesSnapshot.forEach(doc => {
        const classData = { id: doc.id, ...doc.data() } as Class;
        fetchedAllClasses.push(classData);
      });
      
      setAllClasses(fetchedAllClasses);
      
      if (currentUser.isAdmin) {
        // Admin sees all classes or classes they created
        let classesQuery;
        
        if (selectedClassId) {
          // If a class is selected, only show that class
          classesQuery = query(
            collection(firestore, 'classes'),
            where('id', '==', selectedClassId)
          );
        } else {
          // Otherwise show all classes
          classesQuery = query(
            collection(firestore, 'classes'),
            orderBy('createdAt', 'desc')
          );
        }
        
        const snapshot = await getDocs(classesQuery);
        const adminClasses: Class[] = [];
        
        snapshot.forEach(doc => {
          const classData = { id: doc.id, ...doc.data() } as Class;
          adminClasses.push(classData);
        });
        
        setClasses(adminClasses);
        
        // If there's a selected class ID, fetch and set it
        if (selectedClassId) {
          const selectedClass = adminClasses.find(c => c.id === selectedClassId);
          if (selectedClass) {
            setSelectedAdminClass(selectedClass);
          }
        }
      } else {
        // Students see classes they're enrolled in
        const userEnrolledClasses: Class[] = [];
        const userPendingClasses: Class[] = [];
        
        // Filter classes for student view
        fetchedAllClasses.forEach(classData => {
          if (classData.students && classData.students.includes(currentUser.uid)) {
            userEnrolledClasses.push(classData);
          } else if (classData.pendingStudents && classData.pendingStudents.includes(currentUser.uid)) {
            userPendingClasses.push(classData);
          }
        });
        
        setEnrolledClasses(userEnrolledClasses);
        setPendingClasses(userPendingClasses);
      }
      
      // Check if any class is currently active
      const activeClasses = fetchedAllClasses.filter(c => c.isActive);
      if (activeClasses.length > 0) {
        setActiveClass(activeClasses[0]);
      } else {
        setActiveClass(null);
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

  useEffect(() => {
    fetchClasses();
  }, [currentUser, selectedClassId]);

  useEffect(() => {
    if (selectedClassId && classes.length > 0) {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        const allUserIds = [
          ...(selectedClass.students || []),
          ...(selectedClass.pendingStudents || [])
        ];
        fetchUserDetails(allUserIds);
      }
    }
  }, [classes, selectedClassId]);

  // Create a new class (admin only)
  const createClass = async () => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      if (!newClassName.trim()) {
        toast({
          title: "Error",
          description: "Class name cannot be empty.",
          variant: "destructive",
        });
        return;
      }
      
      const newClassRef = doc(collection(firestore, 'classes'));
      const newClassId = newClassRef.id;
      
      const newClass: Class = {
        id: newClassId,
        name: newClassName,
        description: newClassDescription,
        createdBy: currentUser.uid,
        creatorEmail: currentUser.email || '',
        createdAt: serverTimestamp(),
        password: newClassPassword || undefined,
        students: [],
        pendingStudents: [],
        isActive: false
      };
      
      await setDoc(newClassRef, newClass);
      
      toast({
        title: "Success",
        description: "Class created successfully.",
      });
      
      // Reset form
      setNewClassName('');
      setNewClassDescription('');
      setNewClassPassword('');
      setCreateDialogOpen(false);
      
      // Refresh classes list
      fetchClasses();
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Error",
        description: "Failed to create class.",
        variant: "destructive",
      });
    }
  };

  // Admin class access verification
  const verifyAdminClassAccess = async (classId: string, password: string) => {
    if (!currentUser || !currentUser.isAdmin) return false;
    
    try {
      const classRef = doc(firestore, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        toast({
          title: "Error",
          description: "Class not found.",
          variant: "destructive",
        });
        return false;
      }
      
      const classData = classDoc.data() as Class;
      
      // If creator, no password needed
      if (classData.createdBy === currentUser.uid) {
        setSelectedClassId(classId);
        setSelectedAdminClass(classData as Class);
        // Call onClassSelect callback
        if (onClassSelect) {
          onClassSelect({id: classId, ...classData} as Class);
        }
        
        toast({
          title: "Success",
          description: `You now have access to manage ${classData.name}.`,
        });
        return true;
      }
      
      // Check password
      if (classData.password === password) {
        setSelectedClassId(classId);
        setSelectedAdminClass(classData as Class);
        // Call onClassSelect callback
        if (onClassSelect) {
          onClassSelect({id: classId, ...classData} as Class);
        }
        
        toast({
          title: "Success",
          description: `You now have access to manage ${classData.name}.`,
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "Incorrect password. Access denied.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error verifying class access:", error);
      toast({
        title: "Error",
        description: "Failed to verify class access.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Join a class (student only)
  const joinClass = async (classId: string, password?: string) => {
    if (!currentUser || currentUser.isAdmin) return;
    
    try {
      // Check if class exists
      const classRef = doc(firestore, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        toast({
          title: "Error",
          description: "Class not found. Check the ID and try again.",
          variant: "destructive",
        });
        return;
      }
      
      const classData = classDoc.data() as Class;
      
      // Check if already enrolled
      if (classData.students && classData.students.includes(currentUser.uid)) {
        toast({
          title: "Info",
          description: "You're already enrolled in this class.",
        });
        setJoinDialogOpen(false);
        return;
      }
      
      // Check if already pending
      if (classData.pendingStudents && classData.pendingStudents.includes(currentUser.uid)) {
        toast({
          title: "Info",
          description: "Your enrollment request is pending approval.",
        });
        setJoinDialogOpen(false);
        return;
      }
      
      // Check if student is already enrolled in another class (can only join one)
      const enrolledQuery = query(
        collection(firestore, 'classes'),
        where('students', 'array-contains', currentUser.uid)
      );
      const enrolledSnapshot = await getDocs(enrolledQuery);
      
      if (!enrolledSnapshot.empty) {
        toast({
          title: "Error",
          description: "You can only be enrolled in one class at a time.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if student has pending requests for other classes
      const pendingQuery = query(
        collection(firestore, 'classes'),
        where('pendingStudents', 'array-contains', currentUser.uid)
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      
      if (!pendingSnapshot.empty) {
        toast({
          title: "Error",
          description: "You already have a pending enrollment request for another class.",
        });
        return;
      }
      
      // Add to pending students
      await updateDoc(classRef, {
        pendingStudents: Array.isArray(classData.pendingStudents) 
          ? [...classData.pendingStudents, currentUser.uid]
          : [currentUser.uid]
      });
      
      toast({
        title: "Success",
        description: "Enrollment request sent. Waiting for admin approval.",
      });
      
      // Reset form
      setJoinClassId('');
      setJoinPassword('');
      setJoinDialogOpen(false);
      
      // Refresh classes list
      fetchClasses();
    } catch (error) {
      console.error("Error joining class:", error);
      toast({
        title: "Error",
        description: "Failed to join class.",
        variant: "destructive",
      });
    }
  };

  // Handle the dialog join class (with password if needed)
  const handleDialogJoin = () => {
    joinClass(joinClassId, joinPassword);
  };

  // Approve/reject student enrollment requests (admin only)
  const handleEnrollmentRequest = async (classId: string, studentId: string, approve: boolean) => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const classRef = doc(firestore, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        toast({
          title: "Error",
          description: "Class not found.",
          variant: "destructive",
        });
        return;
      }
      
      const classData = classDoc.data() as Class;
      
      // Remove from pending students
      const pendingStudents = classData.pendingStudents || [];
      const updatedPendingStudents = pendingStudents.filter(id => id !== studentId);
      
      if (approve) {
        // Update user's enrolledClass in Firestore
        await setDoc(doc(firestore, 'users', studentId), {
          enrolledClass: classId
        }, { merge: true });
        
        // Add to enrolled students
        const students = classData.students || [];
        await updateDoc(classRef, {
          students: [...students, studentId],
          pendingStudents: updatedPendingStudents
        });
        
        toast({
          title: "Success",
          description: "Student enrollment approved.",
        });
      } else {
        // Just remove from pending
        await updateDoc(classRef, {
          pendingStudents: updatedPendingStudents
        });
        
        toast({
          title: "Success",
          description: "Student enrollment rejected.",
        });
      }
      
      // Refresh classes list
      fetchClasses();
    } catch (error) {
      console.error("Error handling enrollment request:", error);
      toast({
        title: "Error",
        description: "Failed to process enrollment request.",
        variant: "destructive",
      });
    }
  };

  // Start attendance session (admin only)
  const startAttendance = async (classId: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const classRef = doc(firestore, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        toast({
          title: "Error",
          description: "Class not found.",
          variant: "destructive",
        });
        return;
      }
      
      const now = new Date();
      let endTime = null;
      
      if (activeClassDuration > 0) {
        // Calculate end time based on duration
        endTime = new Date(now.getTime() + activeClassDuration * 60000);
      }
      
      await updateDoc(classRef, {
        isActive: true,
        startTime: serverTimestamp(),
        endTime: endTime,
        duration: activeClassDuration
      });
      
      toast({
        title: "Success",
        description: `Attendance started for ${classDoc.data().name}.`,
      });
      
      setStartAttendanceOpen(false);
      fetchClasses();
    } catch (error) {
      console.error("Error starting attendance:", error);
      toast({
        title: "Error",
        description: "Failed to start attendance session.",
        variant: "destructive",
      });
    }
  };

  // End attendance session (admin only)
  const endAttendance = async (classId: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const classRef = doc(firestore, 'classes', classId);
      
      await updateDoc(classRef, {
        isActive: false,
        endTime: serverTimestamp()
      });
      
      toast({
        title: "Success",
        description: "Attendance session ended.",
      });
      
      setActiveClass(null);
      fetchClasses();
    } catch (error) {
      console.error("Error ending attendance:", error);
      toast({
        title: "Error",
        description: "Failed to end attendance session.",
        variant: "destructive",
      });
    }
  };

  // Delete a class (admin only)
  const deleteClass = async (classId: string, password: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    setDeleteError('');
    
    try {
      // First check if attendance is active
      const classRef = doc(firestore, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        toast({
          title: "Error",
          description: "Class not found.",
          variant: "destructive",
        });
        return;
      }
      
      const classData = classDoc.data() as Class;
      
      if (classData.isActive) {
        toast({
          title: "Error",
          description: "Cannot delete a class with an active attendance session.",
          variant: "destructive",
        });
        return;
      }
      
      // If user is class creator, they can delete without password
      if (classData.createdBy === currentUser.uid) {
        // Delete the class
        await deleteDoc(classRef);
        
        toast({
          title: "Success",
          description: "Class deleted successfully.",
        });
        
        // If this was the selected class, clear the selection
        if (classId === selectedClassId) {
          setSelectedClassId('');
          setSelectedAdminClass(null);
          localStorage.removeItem('selectedAdminClassId');
        }
        
        fetchClasses();
        return;
      }
      
      // For non-creators, verify password
      if (classData.password !== password) {
        setDeleteError('Incorrect password. Class deletion canceled.');
        return;
      }
      
      // Password is correct, proceed with deletion
      await deleteDoc(classRef);
      
      toast({
        title: "Success",
        description: "Class deleted successfully.",
      });
      
      // If this was the selected class, clear the selection
      if (classId === selectedClassId) {
        setSelectedClassId('');
        setSelectedAdminClass(null);
        localStorage.removeItem('selectedAdminClassId');
      }
      
      setDeletePassword('');
      setDeleteDialogOpen(false);
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete class.",
        variant: "destructive",
      });
    }
  };

  // Reset device ID (admin only)
  const resetDeviceId = async (studentId: string, studentEmail: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const userRef = doc(firestore, 'users', studentId);
      await updateDoc(userRef, {
        deviceId: null
      });
      
      toast({
        title: "Device Reset",
        description: `Device ID for ${studentEmail || studentId} has been reset successfully.`,
      });
      
      // Refresh user details to show updated status
      const updatedUserDetails = {...userDetails};
      if (updatedUserDetails[studentId]) {
        updatedUserDetails[studentId] = {
          ...updatedUserDetails[studentId],
          deviceId: null
        };
        setUserDetails(updatedUserDetails);
      }
    } catch (error) {
      console.error("Error resetting device ID:", error);
      toast({
        title: "Error",
        description: "Failed to reset user's device ID.",
        variant: "destructive",
      });
    }
  };

  // Set user as admin (admin only)
  const setUserAsAdmin = async (studentId: string, studentEmail: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const userRef = doc(firestore, 'users', studentId);
      
      // Confirm with user
      if (!window.confirm(`Are you sure you want to set ${studentEmail} as an admin? This will give them full access to manage all classes and attendance.`)) {
        return;
      }
      
      await updateDoc(userRef, {
        isAdmin: true
      });
      
      toast({
        title: "Admin Status Granted",
        description: `${studentEmail} has been promoted to admin status.`,
      });
      
      // Update local user details
      const updatedUserDetails = {...userDetails};
      if (updatedUserDetails[studentId]) {
        updatedUserDetails[studentId] = {
          ...updatedUserDetails[studentId],
          isAdmin: true
        };
        setUserDetails(updatedUserDetails);
      }
    } catch (error) {
      console.error("Error setting user as admin:", error);
      toast({
        title: "Error",
        description: "Failed to grant admin permissions.",
        variant: "destructive",
      });
    }
  };

  // Remove user as admin (admin only)
  const removeUserAsAdmin = async (studentId: string, studentEmail: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
      const userRef = doc(firestore, 'users', studentId);
      
      // Confirm with user
      if (!window.confirm(`Are you sure you want to remove admin privileges from ${studentEmail}?`)) {
        return;
      }
      
      await updateDoc(userRef, {
        isAdmin: false
      });
      
      toast({
        title: "Admin Status Removed",
        description: `${studentEmail} is no longer an admin.`,
      });
      
      // Update local user details
      const updatedUserDetails = {...userDetails};
      if (updatedUserDetails[studentId]) {
        updatedUserDetails[studentId] = {
          ...updatedUserDetails[studentId],
          isAdmin: false
        };
        setUserDetails(updatedUserDetails);
      }
    } catch (error) {
      console.error("Error removing admin status:", error);
      toast({
        title: "Error",
        description: "Failed to remove admin privileges.",
        variant: "destructive",
      });
    }
  };

  // Filter classes based on search query
  const filteredClasses = allClasses.filter(
    cls => cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           cls.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           cls.creatorEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter students based on search query
  const getFilteredStudents = (students: string[] | undefined, searchQuery: string) => {
    if (!students || students.length === 0) return [];
    if (!searchQuery) return students;
    
    return students.filter(studentId => {
      const studentEmail = userDetails[studentId]?.email || studentId;
      const studentName = userDetails[studentId]?.name || '';
      const studentRollNumber = userDetails[studentId]?.rollNumber || '';
      
      return studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) || 
             studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             studentRollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  // Make the admin view responsive
  const renderAdminView = () => {
    return (
      <>
        {renderAdminClassSelector()}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-2 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold">Class Management</h2>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Create Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Create New Class</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new class for students to enroll in.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">Class Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter class name" 
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="description" className="text-sm sm:text-base">Description (Optional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Enter class description" 
                    value={newClassDescription}
                    onChange={(e) => setNewClassDescription(e.target.value)}
                    className="text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Class Password (Required for Admin Access)</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Set a password" 
                    value={newClassPassword}
                    onChange={(e) => setNewClassPassword(e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    This password will be used by other admins to access and manage this class.
                  </p>
                </div>
              </div>
              
              <DialogFooter className="gap-1 sm:gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)} 
                  className="text-xs sm:text-sm h-7 sm:h-9"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createClass}
                  className="text-xs sm:text-sm h-7 sm:h-9"
                >
                  Create Class
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {!selectedAdminClass ? (
          <Card className="mb-3 sm:mb-6">
            <CardContent className="py-4 sm:py-8 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Please select a class to manage from the dropdown above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {loading ? (
              <div className="flex justify-center py-4 sm:py-8">
                <RefreshCcw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <Card>
                <CardContent className="py-4 sm:py-8 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">No classes found. Create your first class.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {classes.filter(cls => cls.id === selectedClassId).map((cls) => (
                  <Card key={cls.id} className="mb-2 sm:mb-4">
                    <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                        <div>
                          <CardTitle className="text-base sm:text-xl">{cls.name}</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Created by: {cls.creatorEmail}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {cls.isActive ? (
                            <Button 
                              variant="destructive" 
                              onClick={() => endAttendance(cls.id)}
                              className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
                            >
                              End Attendance
                            </Button>
                          ) : (
                            <Button 
                              className="flex items-center text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
                              onClick={() => {
                                setClassIdToStartAttendance(cls.id);
                                setStartAttendanceDialogOpen(true);
                              }}
                            >
                              Start Attendance
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setClassIdToDelete(cls.id);
                              setDeletePassword('');
                              setDeleteError('');
                              setDeleteDialogOpen(true);
                            }}
                            disabled={cls.isActive}
                            className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-3 py-2 sm:px-6 sm:py-3">
                      {cls.description && <p className="mb-2 sm:mb-4 text-xs sm:text-sm text-muted-foreground">{cls.description}</p>}
                      
                      {/* Create tabs for students and approvals */}
                      <Tabs defaultValue="students" className="mt-2 sm:mt-4">
                        <TabsList className="mb-2 sm:mb-4 h-8 sm:h-10">
                          <TabsTrigger value="students" className="text-xs sm:text-sm">
                            Students ({cls.students?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="approvals" className="relative text-xs sm:text-sm">
                            Enrollment Requests
                            {cls.pendingStudents && cls.pendingStudents.length > 0 && (
                              <span className="ml-1 sm:ml-2 bg-red-100 text-red-800 text-[10px] sm:text-xs rounded-full px-1.5 py-0.5">
                                {cls.pendingStudents.length}
                              </span>
                            )}
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="students">
                          {!cls.students || cls.students.length === 0 ? (
                            <p className="text-xs sm:text-sm text-muted-foreground">No students enrolled yet.</p>
                          ) : (
                            <div className="text-xs sm:text-sm">
                              <div className="mb-2">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search students by email, name or roll number..."
                                    className="pl-7 sm:pl-8 h-7 sm:h-9 text-xs sm:text-sm"
                                    value={studentSearchQuery}
                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                  />
                                  {studentSearchQuery && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="absolute right-0 top-0 h-full px-1 sm:px-3"
                                      onClick={() => setStudentSearchQuery('')}
                                    >
                                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="rounded-md border max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                                <Table>
                                  <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                      <TableHead className="bg-muted px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">Student Email</TableHead>
                                      <TableHead className="bg-muted px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">Status</TableHead>
                                      <TableHead className="bg-muted px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {getFilteredStudents(cls.students, studentSearchQuery).length > 0 ? (
                                      getFilteredStudents(cls.students, studentSearchQuery).map(studentId => {
                                        const studentEmail = userDetails[studentId]?.email || studentId;
                                        const isUserAdmin = userDetails[studentId]?.isAdmin === true;
                                        
                                        return (
                                          <TableRow key={studentId}>
                                            <TableCell className="px-2 py-1 sm:px-4 sm:py-2 max-w-[120px] sm:max-w-none truncate">
                                              {studentEmail}
                                            </TableCell>
                                            <TableCell className="px-2 py-1 sm:px-4 sm:py-2">
                                              <div className="flex flex-wrap gap-1">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] sm:text-xs px-1 py-0 sm:px-2 sm:py-0.5">
                                                  Enrolled
                                                </Badge>
                                                {isUserAdmin && (
                                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] sm:text-xs px-1 py-0 sm:px-2 sm:py-0.5">
                                                    Admin
                                                  </Badge>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell className="px-2 py-1 sm:px-4 sm:py-2">
                                              <div className="flex items-center justify-start gap-1 sm:gap-2">
                                                <Button 
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs text-orange-600 hover:text-orange-700"
                                                  onClick={() => resetDeviceId(studentId, studentEmail)}
                                                >
                                                  <Smartphone className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                                  <span className="hidden xs:inline">Reset</span> Device
                                                </Button>
                                                
                                                {isUserAdmin ? (
                                                  <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs text-red-600 hover:text-red-700"
                                                    onClick={() => removeUserAsAdmin(studentId, studentEmail)}
                                                  >
                                                    <UserPlus className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                                    <span className="hidden xs:inline">Remove</span> Admin
                                                  </Button>
                                                ) : (
                                                  <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs text-blue-600 hover:text-blue-700"
                                                    onClick={() => setUserAsAdmin(studentId, studentEmail)}
                                                  >
                                                    <UserPlus className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                                    <span className="hidden xs:inline">Set as</span> Admin
                                                  </Button>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-center py-3 text-xs sm:text-sm text-muted-foreground">
                                          No students match your search
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              
                              {studentSearchQuery && cls.students && cls.students.length > 0 && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  Showing {getFilteredStudents(cls.students, studentSearchQuery).length} of {cls.students.length} students
                                </p>
                              )}
                            </div>
                          )}
                        </TabsContent>
                        
                        {/* New tab for enrollment requests */}
                        <TabsContent value="approvals">
                          {!cls.pendingStudents || cls.pendingStudents.length === 0 ? (
                            <div className="text-center py-4 sm:py-8 border rounded-md">
                              <p className="text-xs sm:text-sm text-muted-foreground">No pending enrollment requests.</p>
                            </div>
                          ) : (
                            <div>
                              <div className="mb-2">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search pending requests..."
                                    className="pl-7 sm:pl-8 h-7 sm:h-9 text-xs sm:text-sm"
                                    value={pendingSearchQuery}
                                    onChange={(e) => setPendingSearchQuery(e.target.value)}
                                  />
                                  {pendingSearchQuery && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="absolute right-0 top-0 h-full px-1 sm:px-3"
                                      onClick={() => setPendingSearchQuery('')}
                                    >
                                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="rounded-md border max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                                <Table>
                                  <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                      <TableHead className="bg-muted px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">Student Email</TableHead>
                                      <TableHead className="bg-muted px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {getFilteredStudents(cls.pendingStudents, pendingSearchQuery).length > 0 ? (
                                      getFilteredStudents(cls.pendingStudents, pendingSearchQuery).map(studentId => (
                                        <TableRow key={studentId}>
                                          <TableCell className="px-2 py-1 sm:px-4 sm:py-2 max-w-[120px] sm:max-w-none truncate">
                                            {userDetails[studentId]?.email || studentId}
                                          </TableCell>
                                          <TableCell className="px-2 py-1 sm:px-4 sm:py-2 text-right">
                                            <div className="flex justify-end space-x-1 sm:space-x-2">
                                              <Button 
                                                size="sm"
                                                variant="outline" 
                                                className="h-6 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
                                                onClick={() => handleEnrollmentRequest(cls.id, studentId, true)}
                                              >
                                                <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                                <span className="hidden xs:inline">Approve</span>
                                              </Button>
                                              <Button 
                                                size="sm"
                                                variant="outline" 
                                                className="h-6 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleEnrollmentRequest(cls.id, studentId, false)}
                                              >
                                                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                                <span className="hidden xs:inline">Reject</span>
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={2} className="text-center py-3 text-xs sm:text-sm text-muted-foreground">
                                          No pending requests match your search
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              
                              {pendingSearchQuery && cls.pendingStudents && cls.pendingStudents.length > 0 && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  Showing {getFilteredStudents(cls.pendingStudents, pendingSearchQuery).length} of {cls.pendingStudents.length} pending requests
                                </p>
                              )}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                      
                      {cls.password && (
                        <div className="mt-2 sm:mt-4 flex items-center">
                          <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mr-1" />
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Password protected</span>
                        </div>
                      )}
                    </CardContent>
                    
                    {cls.isActive && (
                      <CardFooter className="bg-green-50 border-t border-green-100 flex items-center px-3 py-2 sm:px-6 sm:py-3">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-1 sm:mr-2" />
                        <span className="text-[10px] sm:text-xs text-green-700">
                          Attendance session active
                          {cls.startTime && ` (Started: ${new Date(cls.startTime.toDate()).toLocaleTimeString()})`}
                          {cls.endTime && ` - Ends: ${new Date(cls.endTime.toDate()).toLocaleTimeString()}`}
                        </span>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Make the class selector responsive
  const renderAdminClassSelector = () => {
    return (
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <Card className="mb-3 sm:mb-6">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg">Class Access Control</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Select a class to manage and enter the password if required</CardDescription>
          </CardHeader>
          <CardContent className="px-3 py-2 sm:px-6 sm:py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <select
                className="border rounded-md px-2 sm:px-3 py-1 sm:py-2 flex-1 bg-background text-xs sm:text-sm w-full"
                value={selectedClassId}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedClassId(e.target.value);
                    const selectedClass = allClasses.find(cls => cls.id === e.target.value);
                    
                    // If current user is creator, no need for password
                    if (selectedClass && selectedClass.createdBy === currentUser?.uid) {
                      setSelectedAdminClass(selectedClass);
                      if (onClassSelect) {
                        onClassSelect(selectedClass);
                        localStorage.setItem('selectedAdminClassId', selectedClass.id);
                      }
                    } else {
                      // Open password dialog
                      setAdminAccessPassword('');
                      setPasswordDialogOpen(true);
                    }
                  } else {
                    setSelectedClassId('');
                    setSelectedAdminClass(null);
                    localStorage.removeItem('selectedAdminClassId');
                  }
                }}
              >
                <option value="">Select a class to manage</option>
                {allClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.createdBy === currentUser?.uid ? '(Your class)' : ''}
                  </option>
                ))}
              </select>
              <Button 
                onClick={() => {
                  setSelectedClassId('');
                  setSelectedAdminClass(null);
                  localStorage.removeItem('selectedAdminClassId');
                  if (onClassSelect) {
                    onClassSelect({} as Class);
                  }
                }}
                className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
              >
                Clear
              </Button>
            </div>
            
            {selectedAdminClass && (
              <div className="mt-2 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-100 rounded-md">
                <p className="font-medium text-xs sm:text-sm text-blue-800">
                  Currently managing: {selectedAdminClass.name}
                </p>
                <p className="text-[10px] sm:text-xs text-blue-600">
                  {selectedAdminClass.description || "No description"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Enter Class Password</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This class requires a password for admin access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="classPassword" className="text-sm sm:text-base">Password</Label>
              <Input 
                id="classPassword" 
                type="password"
                placeholder="Enter class password" 
                value={adminAccessPassword}
                onChange={(e) => setAdminAccessPassword(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setPasswordDialogOpen(false);
                setSelectedClassId('');
              }}
              className="text-xs sm:text-sm h-7 sm:h-9"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                verifyAdminClassAccess(selectedClassId, adminAccessPassword);
                setPasswordDialogOpen(false);
              }}
              className="text-xs sm:text-sm h-7 sm:h-9"
            >
              Access Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Make the student view responsive
  const renderStudentView = () => {
    return (
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-2 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold">My Classes</h2>
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Join Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Join a Class</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Select a class to join from the available classes.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="classId" className="text-sm sm:text-base">Select Class</Label>
                  <select
                    id="classId"
                    className="w-full border border-input bg-background px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm"
                    value={joinClassId}
                    onChange={(e) => setJoinClassId(e.target.value)}
                  >
                    <option value="">Select a class</option>
                    {filteredClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <DialogFooter className="gap-1 sm:gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setJoinDialogOpen(false)}
                  className="text-xs sm:text-sm h-7 sm:h-9"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDialogJoin}
                  className="text-xs sm:text-sm h-7 sm:h-9"
                >
                  Send Join Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="all">
          <TabsList className="mb-2 sm:mb-4 h-8 sm:h-10">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All Classes</TabsTrigger>
            <TabsTrigger value="enrolled" className="text-xs sm:text-sm">My Enrolled Classes</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending Enrollment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <div className="mb-2 sm:mb-4">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search classes by name or description..."
                  className="pl-7 sm:pl-10 h-7 sm:h-9 text-xs sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-4 sm:py-8">
                <RefreshCcw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClasses.length === 0 ? (
              <Card>
                <CardContent className="py-4 sm:py-8 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">No classes found matching your search.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                  {filteredClasses.map((cls) => {
                    const isEnrolled = cls.students && cls.students.includes(currentUser?.uid || '');
                    const isPending = cls.pendingStudents && cls.pendingStudents.includes(currentUser?.uid || '');
                    
                    return (
                      <Card key={cls.id} className="overflow-hidden">
                        <CardHeader className="px-3 py-2 sm:px-6 sm:py-3">
                          <CardTitle className="text-sm sm:text-base">{cls.name}</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Instructor: {cls.creatorEmail}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-3 py-2 sm:px-6 sm:py-3">
                          {cls.description && <p className="mb-2 sm:mb-4 text-xs sm:text-sm line-clamp-2">{cls.description}</p>}
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span>{cls.students?.length || 0} students enrolled</span>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between px-3 py-2 sm:px-6 sm:py-3 bg-muted/10">
                          {isEnrolled ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] sm:text-xs">
                              Enrolled
                            </Badge>
                          ) : isPending ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-[10px] sm:text-xs">
                              Pending Approval
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setJoinClassId(cls.id);
                                setJoinDialogOpen(true);
                              }}
                              className="h-7 sm:h-8 text-[10px] sm:text-xs"
                            >
                              Join Class
                            </Button>
                          )}
                          
                          {cls.isActive && (
                            <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs">
                              Active
                            </Badge>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="enrolled">
            {loading ? (
              <div className="flex justify-center py-4 sm:py-8">
                <RefreshCcw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : enrolledClasses.length === 0 ? (
              <Card>
                <CardContent className="py-4 sm:py-8 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">You are not enrolled in any classes yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2 space-y-2 sm:space-y-4">
                {enrolledClasses.map((cls) => (
                  <Card key={cls.id}>
                    <CardHeader className="px-3 py-2 sm:px-6 sm:py-3">
                      <CardTitle className="text-sm sm:text-base">{cls.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Instructor: {cls.creatorEmail}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 py-2 sm:px-6 sm:py-3">
                      {cls.description && <p className="mb-2 sm:mb-4 text-xs sm:text-sm">{cls.description}</p>}
                    </CardContent>
                    {cls.isActive && (
                      <CardFooter className="bg-green-50 border-t border-green-100 px-3 py-2 sm:px-6 sm:py-3">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-1 sm:mr-2" />
                          <span className="text-[10px] sm:text-xs text-green-700">
                            Attendance session active
                            {cls.startTime && ` (Started: ${new Date(cls.startTime.toDate()).toLocaleTimeString()})`}
                          </span>
                        </div>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending">
            {loading ? (
              <div className="flex justify-center py-4 sm:py-8">
                <RefreshCcw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingClasses.length === 0 ? (
              <Card>
                <CardContent className="py-4 sm:py-8 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">You don't have any pending enrollment requests.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2 space-y-2 sm:space-y-4">
                {pendingClasses.map((cls) => (
                  <Card key={cls.id}>
                    <CardHeader className="px-3 py-2 sm:px-6 sm:py-3">
                      <CardTitle className="text-sm sm:text-base">{cls.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Instructor: {cls.creatorEmail}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 py-2 sm:px-6 sm:py-3">
                      {cls.description && <p className="mb-2 sm:mb-4 text-xs sm:text-sm">{cls.description}</p>}
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-[10px] sm:text-xs">
                        Pending Approval
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </>
    );
  };

  // Add dialog for starting attendance
  const AttendanceStartDialog = () => (
    <Dialog open={startAttendanceDialogOpen} onOpenChange={setStartAttendanceDialogOpen}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Start Attendance Session</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Set the duration for this attendance session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="duration" className="text-sm sm:text-base">Session Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="60"
              min="1"
              value={activeClassDuration.toString()}
              onChange={(e) => setActiveClassDuration(parseInt(e.target.value) || 60)}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Set to 0 for unlimited duration (manual ending)
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-1 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => setStartAttendanceDialogOpen(false)}
            className="text-xs sm:text-sm h-7 sm:h-9"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              startAttendance(classIdToStartAttendance);
              setStartAttendanceDialogOpen(false);
            }}
            className="text-xs sm:text-sm h-7 sm:h-9"
          >
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Add dialog for deleting class
  const DeleteClassDialog = () => (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg text-red-600">Delete Class</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            This action cannot be undone. Please enter the class password to confirm deletion.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="deletePassword" className="text-sm sm:text-base">Class Password</Label>
            <Input
              id="deletePassword"
              type="password"
              placeholder="Enter class password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            />
            {deleteError && (
              <p className="text-[10px] sm:text-xs text-red-600 mt-1">
                {deleteError}
              </p>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Note: Class creators can delete without password verification.
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-1 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletePassword('');
              setDeleteError('');
            }}
            className="text-xs sm:text-sm h-7 sm:h-9"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={() => deleteClass(classIdToDelete, deletePassword)}
            disabled={!classIdToDelete}
            className="text-xs sm:text-sm h-7 sm:h-9"
          >
            Delete Class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-2 sm:p-4">
      {currentUser?.isAdmin ? renderAdminView() : renderStudentView()}
      <AttendanceStartDialog />
      <DeleteClassDialog />
    </div>
  );
};

// This function should be added to your useAuth hook or modified if it exists
const storeDeviceId = async (userId: string, deviceId: string) => {
  try {
    // First check if the user is an admin
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists() && userDoc.data().isAdmin === true) {
      // Skip storing device ID for admin users
      console.log("Admin user detected - skipping device ID storage");
      return;
    }
    
    // For non-admin users, store the device ID
    await updateDoc(doc(firestore, 'users', userId), {
      deviceId: deviceId
    });
  } catch (error) {
    console.error("Error storing device ID:", error);
    throw error;
  }
};

export default ClassManagement;