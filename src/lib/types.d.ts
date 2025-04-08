
import { Timestamp } from 'firebase/firestore';

export interface Class {
  id: string;
  name: string;
  description?: string;
  code: string;
  instructor: string;
  instructorId: string;
  isActive?: boolean;
  createdAt?: Timestamp;
  startTime?: Timestamp | Date;
  endTime?: Timestamp | Date | null;
  currentSessionId?: string | null;
  lastSessionId?: string | null;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  enrolledClass?: string;
  deviceId?: string;
  rollNumber?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  rollNumber?: string;
  timestamp: Timestamp;
  date: string;
  verified: boolean;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  classId: string;
  sessionId?: string;
  automarked?: boolean;
}

export interface UserReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rollNumber?: string;
  issueDetails: string;
  status: 'pending' | 'resolved' | 'rejected';
  timestamp: Timestamp;
  classId: string;
  sessionId?: string;
  response?: string;
  responseTimestamp?: Timestamp;
  respondedBy?: string;
}