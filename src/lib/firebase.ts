
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, DocumentData, DocumentReference } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { collection, query, getDocs, where } from "firebase/firestore";
import { updateDoc as firestoreUpdateDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const database = getDatabase(app);

// Re-export Firebase functions to ensure they're always accessible
export {
  doc, getDoc, updateDoc, setDoc, Timestamp, onSnapshot,
  collection, query, getDocs, where, orderBy, limit
};

// Helper function to validate email domain
export const isValidDomain = (email: string): boolean => {
  return (
    email.endsWith('@stu.adamasuniversity.ac.in') || 
    email.endsWith('@adamasuniversity.ac.in')
  );
};

// Helper function to check if user is admin
export const isAdminEmail = (email: string): boolean => {
  return email.endsWith('@adamasuniversity.ac.in');
};

// Helper function to update a class and handle session IDs
export const updateClassAttendanceSession = async (classId: string, isActive: boolean): Promise<boolean> => {
  try {
    const classRef = doc(firestore, 'classes', classId);
    const now = new Date();
    const sessionId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (isActive) {
      // Starting a session
      await updateDoc(classRef, {
        isActive: true,
        startTime: Timestamp.now(),
        currentSessionId: sessionId
      });
    } else {
      // Ending a session
      await updateDoc(classRef, {
        isActive: false,
        endTime: Timestamp.now(),
        lastSessionId: sessionId,
        currentSessionId: null
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error updating class attendance session:", error);
    return false;
  }
};

// Helper function to fetch attendance records without complex indexed queries
export const getAttendanceRecordsForClass = async (classId: string) => {
  try {
    // Use a simple query that doesn't require complex indexes
    const attendanceQuery = query(
      collection(firestore, 'attendance'),
      where('classId', '==', classId),
      limit(100) // Add a limit to ensure we don't fetch too many documents
    );
    
    const snapshot = await getDocs(attendanceQuery);
    const records: any[] = [];
    
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by timestamp client-side to avoid requiring index
    records.sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(0);
      const timeB = b.timestamp?.toDate?.() || new Date(0);
      return timeB.getTime() - timeA.getTime();
    });
    
    return records;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return [];
  }
};

// Helper function to check if attendance is already marked for a session
export const isAttendanceMarkedForSession = async (userId: string, classId: string, sessionId?: string) => {
  try {
    if (!sessionId) {
      // Get the current session ID from the class
      const classDoc = await getDoc(doc(firestore, 'classes', classId));
      if (!classDoc.exists()) return false;
      sessionId = classDoc.data().currentSessionId;
      if (!sessionId) return false;
    }
    
    const attendanceId = `${userId}_${classId}_${sessionId}`;
    const attendanceDoc = await getDoc(doc(firestore, 'attendance', attendanceId));
    
    return attendanceDoc.exists();
  } catch (error) {
    console.error("Error checking attendance status:", error);
    return false;
  }
};

// Helper function to check if a student is enrolled in a specific class
export const isStudentInClass = async (userId: string, classId: string): Promise<boolean> => {
  try {
    const classesRef = collection(firestore, 'classes');
    const classQuery = query(
      classesRef,
      where('id', '==', classId),
      where('students', 'array-contains', userId)
    );
    
    const querySnapshot = await getDocs(classQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking class enrollment:", error);
    return false;
  }
};

// Helper function for admin to verify if they own a class or have password
export const verifyClassAccess = async (userId: string, classId: string, password?: string): Promise<boolean> => {
  try {
    const classRef = doc(firestore, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) return false;
    
    const classData = classDoc.data() as any;
    
    // Creator always has access
    if (classData.createdBy === userId) return true;
    
    // If password is provided and matches
    if (password && classData.password === password) return true;
    
    return false;
  } catch (error) {
    console.error("Error verifying class access:", error);
    return false;
  }
};

// Helper function to get all active classes
export const getActiveClasses = async () => {
  try {
    const classesRef = collection(firestore, 'classes');
    const activeQuery = query(
      classesRef,
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(activeQuery);
    const activeClasses: any[] = [];
    
    querySnapshot.forEach(doc => {
      activeClasses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return activeClasses;
  } catch (error) {
    console.error("Error fetching active classes:", error);
    return [];
  }
};

// Helper function to get all classes for a student
export const getStudentClasses = async (userId: string) => {
  try {
    const classesRef = collection(firestore, 'classes');
    const classQuery = query(
      classesRef,
      where('students', 'array-contains', userId)
    );
    
    const querySnapshot = await getDocs(classQuery);
    const classes: any[] = [];
    
    querySnapshot.forEach(doc => {
      classes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return classes;
  } catch (error) {
    console.error("Error fetching student classes:", error);
    return [];
  }
};

// Helper function to get the max allowed distance for location verification
export const getMaxAllowedDistance = async (): Promise<number> => {
  try {
    const settingsRef = doc(firestore, 'settings', 'geolocation');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      // Support both old and new field names
      return data.maxDistance || data.radiusInMeters || 100; // Default to 100m if not set
    }
    
    return 100; // Default value is 100m
  } catch (error) {
    console.error("Error fetching max allowed distance:", error);
    return 100; // Default value in case of error
  }
};

// Helper function to reset a user's device ID
export const resetUserDeviceId = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;
    
    await updateDoc(userRef, {
      deviceId: null
    });
    
    return true;
  } catch (error) {
    console.error("Error resetting user device ID:", error);
    return false;
  }
};

// Helper function to get attendance records for a specific session
export const getAttendanceRecordsForSession = async (classId: string, sessionId: string) => {
  try {
    const attendanceQuery = query(
      collection(firestore, 'attendance'),
      where('classId', '==', classId),
      where('sessionId', '==', sessionId),
      limit(100) // Adding a limit to avoid excessive data fetching
    );
    
    const snapshot = await getDocs(attendanceQuery);
    const records: any[] = [];
    
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return records;
  } catch (error) {
    console.error("Error fetching session attendance records:", error);
    return [];
  }
};

export default app;