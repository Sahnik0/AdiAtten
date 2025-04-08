
// Common types used across the application

export interface AttendanceRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  rollNumber?: string;
  timestamp: any;
  date: string;
  verified: boolean;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  classId: string; // Required for class-based attendance tracking
  sessionId?: string; // Session identifier
  automarked?: boolean; // Indicates if the record was automatically marked
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  creatorEmail: string;
  createdAt: any;
  password?: string;
  students: string[]; // User IDs of enrolled students
  pendingStudents: string[]; // User IDs of students waiting for approval
  isActive: boolean;
  startTime?: any;
  endTime?: any;
  duration?: number; // Minutes
  currentSessionId?: string; // Current session ID
  lastSessionId?: string; // Last session ID
}

export interface PendingAttendance {
  userId: string;
  email: string;
  name: string;
  rollNumber?: string;
  timestamp: number;
  date: string;
  classId: string;
  sessionId?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

// Add StudentRecord interface to help with storing student information
export interface StudentRecord {
  id: string;
  email: string;
  name: string;
  rollNumber?: string;
  isAdmin: boolean;
  deviceId?: string;
  emailVerified: boolean;
  enrolledClass?: string; // The class ID that the student is enrolled in
  uid?: string; // Firebase auth user ID
  displayName?: string; // User's display name
  classes?: string[]; // List of class IDs the student is enrolled in
}

// Interface for user reports
export interface UserReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rollNumber?: string;
  issueDetails: string;
  status: 'pending' | 'resolved' | 'rejected';
  timestamp: any;
  classId?: string; // The class ID the report is associated with
  response?: string; // Admin's response to the report
  responseTimestamp?: any; // When the admin responded
  respondedBy?: string; // Admin who responded
  sessionId?: string; // Session identifier for reports
}

// Add AuthUser interface to define properties of authenticated users
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  rollNumber?: string;
  deviceId?: string;
  enrolledClass?: string; // Add enrolledClass property to AuthUser
  classes?: string[]; // Classes that the user is enrolled in
}

// Add SessionHistory interface
export interface SessionHistory {
  id: string;
  classId: string;
  className: string;
  startTime: any;
  endTime: any;
  sessionId: string;
  attendanceCount: number;
  presentCount: number;
  absentCount: number;
  createdBy: string;
}