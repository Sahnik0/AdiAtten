
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
}

export interface PendingAttendance {
  userId: string;
  email: string;
  name: string;
  rollNumber?: string;
  timestamp: number;
  date: string;
  classId: string;
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
}
