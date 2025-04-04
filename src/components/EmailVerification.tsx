
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, RefreshCcw, CheckCircle } from 'lucide-react';

const EmailVerification = () => {
  const { currentUser, sendVerificationEmail } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const { toast } = useToast();

  // Check if email is verified
  const checkVerification = useCallback(() => {
    if (!currentUser) return;
    
    setIsVerifying(true);
    
    // Refresh the current user to check if email has been verified
    auth.currentUser?.reload()
      .then(() => {
        // Force update of the user object
        onAuthStateChanged(auth, (user) => {
          if (user?.emailVerified) {
            setIsVerifying(false);
            setIsTimerRunning(false);
            toast({
              title: "Email Verified",
              description: "Your email has been successfully verified.",
            });
          }
        });
      })
      .catch((error) => {
        console.error("Error reloading user:", error);
        setIsVerifying(false);
      });
  }, [currentUser, toast]);

  // Start the verification process
  const startVerification = () => {
    sendVerificationEmail();
    setIsTimerRunning(true);
    setVerificationTimer(120); // 2 minutes timer
    
    toast({
      title: "Verification Email Sent",
      description: "Please check your inbox and click the verification link.",
    });
  };

  // Effect for verification timer
  useEffect(() => {
    let interval: number | undefined;
    
    if (isTimerRunning && verificationTimer > 0) {
      interval = window.setInterval(() => {
        setVerificationTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setIsTimerRunning(false);
            clearInterval(interval);
            return 0;
          }
          return prevTimer - 1;
        });
        
        // Check verification status every few seconds
        checkVerification();
      }, 1000);
    } else if (verificationTimer === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      toast({
        title: "Verification Timeout",
        description: "Email verification timed out. Please try again.",
        variant: "destructive",
      });
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, verificationTimer, checkVerification, toast]);

  if (!currentUser || currentUser.emailVerified) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          {isTimerRunning ? (
            <RefreshCcw className="h-5 w-5 text-yellow-500 animate-spin" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-yellow-800">Email Verification Required</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your email address needs to be verified before you can access all features.
              {isTimerRunning && (
                <span className="block mt-2">
                  Checking for verification... ({verificationTimer}s remaining)
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              onClick={startVerification}
              disabled={isTimerRunning || isVerifying}
            >
              <Mail className="mr-1 h-4 w-4" />
              {isTimerRunning ? 'Email Sent' : 'Send Verification Email'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center text-yellow-800"
              onClick={checkVerification}
              disabled={isVerifying}
            >
              <RefreshCcw className={`mr-1 h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
