
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  sendEmailVerification,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, firestore, isValidDomain, isAdminEmail } from '@/lib/firebase';
import { getDeviceId } from '@/lib/deviceFingerprint';
import { useToast } from '@/hooks/use-toast';

export interface AuthUser extends Omit<FirebaseUser, 'displayName'> {
  isAdmin: boolean;
  displayName?: string | null;
  rollNumber?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  register: (email: string, password: string, displayName?: string, rollNumber?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  isDeviceVerified: boolean;
  deviceVerificationLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeviceVerified, setIsDeviceVerified] = useState(false);
  const [deviceVerificationLoading, setDeviceVerificationLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if email is verified
        if (!user.emailVerified) {
          toast({
            title: "Email Not Verified",
            description: "Please check your inbox and verify your email address.",
            variant: "destructive",
          });
        }

        // Extend the user object with isAdmin property
        const authUser = user as unknown as AuthUser;
        authUser.isAdmin = false; // Default to false

        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.displayName) authUser.displayName = userData.displayName;
            if (userData.rollNumber) authUser.rollNumber = userData.rollNumber;
            if (userData.isAdmin !== undefined) authUser.isAdmin = userData.isAdmin;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
        
        setCurrentUser(authUser);
        
        // Verify device
        await verifyDevice(user);
      } else {
        setCurrentUser(null);
        setIsDeviceVerified(false);
        setDeviceVerificationLoading(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const verifyDevice = async (user: FirebaseUser) => {
    setDeviceVerificationLoading(true);
    try {
      const deviceId = await getDeviceId();
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If user has a registered device ID
        if (userData.deviceId) {
          // Check if it matches the current device
          setIsDeviceVerified(userData.deviceId === deviceId);
          
          if (userData.deviceId !== deviceId) {
            // Device mismatch - sign out if not admin
            if (!isAdminEmail(user.email || '')) {
              toast({
                title: "Device Verification Failed",
                description: "This account is registered to another device. Contact admin for help.",
                variant: "destructive",
              });
              await firebaseSignOut(auth);
            }
          }
        } else {
          // First login, register this device
          await setDoc(userRef, { 
            deviceId,
            isAdmin: isAdminEmail(user.email || ''),
          }, { merge: true });
          setIsDeviceVerified(true);
        }
      } else {
        // Create user document with device ID
        await setDoc(userRef, {
          deviceId,
          email: user.email,
          displayName: user.displayName,
          isAdmin: isAdminEmail(user.email || ''),
          createdAt: new Date(),
        });
        setIsDeviceVerified(true);
      }
    } catch (error) {
      console.error("Error verifying device:", error);
      toast({
        title: "Device Verification Error",
        description: "There was an error verifying your device.",
        variant: "destructive",
      });
      setIsDeviceVerified(false);
    } finally {
      setDeviceVerificationLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string, rollNumber?: string) => {
    try {
      // Check if email domain is valid
      if (!isValidDomain(email)) {
        toast({
          title: "Invalid Email Domain",
          description: "Please use your university email to sign up.",
          variant: "destructive",
        });
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Save additional user information to Firestore
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        displayName: displayName || user.displayName || email.split('@')[0],
        rollNumber: rollNumber || '',
        isAdmin: isAdminEmail(user.email || ''),
        createdAt: new Date(),
      }, { merge: true });
      
      // Send verification email
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and verify your email address.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register account.",
        variant: "destructive",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check if email domain is valid
      if (!isValidDomain(email)) {
        toast({
          title: "Invalid Email Domain",
          description: "Please use your university email to sign in.",
          variant: "destructive",
        });
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      
      // Email verification check is handled in the onAuthStateChanged listener
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Failed to sign in.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Failed",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox and verify your email address.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Send Verification Email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        register,
        signIn,
        signOut,
        sendVerificationEmail,
        isDeviceVerified,
        deviceVerificationLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
