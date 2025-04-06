
import { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import LoginView from '@/components/LoginView';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  useEffect(() => {
    document.title = 'Campus Guard Attendance System';
  }, []);

  return (
    <AuthProvider>
      <LoginView />
      <Toaster />
    </AuthProvider>
  );
};

export default Index;