
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { collection, query, getDocs, where } from "firebase/firestore";

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
      return data.maxDistance || 300; // Default to 300m if not set
    }
    
    return 300; // Default value
  } catch (error) {
    console.error("Error fetching max allowed distance:", error);
    return 300; // Default value in case of error
  }
};

/*
Firebase Security Configuration Guide:

1. Firestore Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Classes rules
    match /classes/{classId} {
      // Only admins can create classes
      allow create: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      
      // Anyone can read classes
      allow read: if request.auth != null;
      
      // Only class creator or admins with password can update/delete
      allow update, delete: if request.auth != null && (
        resource.data.createdBy == request.auth.uid || 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true && 
         resource.data.password == request.resource.data.password)
      );
    }
    
    // Attendance records
    match /attendance/{recordId} {
      // Students can only create/read their own attendance records
      allow create: if request.auth != null && 
                     recordId.matches(request.auth.uid + "_.+");
      
      // Students can read their own attendance
      // Admins can read all attendance for classes they have access to
      allow read: if request.auth != null && (
        recordId.matches(request.auth.uid + "_.+") || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true
      );
      
      // Only admins can update/delete attendance records
      allow update, delete: if request.auth != null && 
                           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Settings can only be accessed by admins
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

2. Realtime Database Rules:
```
{
  "rules": {
    ".read": "auth != null",
    "attendancePending": {
      "$uid": {
        // Users can only write their own pending attendance
        ".write": "auth != null && auth.uid == $uid",
        // Admins can read all, users can only read their own
        ".read": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
      }
    },
    "attendanceVerified": {
      "$uid": {
        // Similar rules for verified attendance
        ".write": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)",
        ".read": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('isAdmin').val() == true)"
      }
    },
    "users": {
      "$uid": {
        // Users can read/write their own data
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid",
        // Admin status can only be set by existing admins
        "isAdmin": {
          ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true"
        }
      }
    },
    "classData": {
      "$classId": {
        // Only enrolled students and admins with password can access class data
        ".read": "auth != null && (root.child('users').child(auth.uid).child('isAdmin').val() == true || root.child('classes').child($classId).child('students').child(auth.uid).exists())",
        ".write": "auth != null && root.child('users').child(auth.uid).child('isAdmin').val() == true"
      }
    }
  }
}
```

3. Authentication Rules:
- Enable Email/Password authentication
- Set email verification to required for admin features only
- Configure email templates for verification

4. Realtime Database Structure:
/attendancePending/{userId} - For pending attendance submissions
/attendanceVerified/{userId} - For verified attendance records
/users/{userId} - User profile data including isAdmin flag
/classData/{classId} - Class-specific dynamic data

5. Firestore Structure:
/users/{userId} - User profiles
/classes/{classId} - Class information
/attendance/{recordId} - Attendance records (format: userId_date_classId)
/settings/geolocation - Geolocation settings for campus with maxDistance: 300 (meters)
*/

export default app;
