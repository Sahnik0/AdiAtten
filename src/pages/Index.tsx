
import { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import LoginView from '@/components/LoginView';

const Index = () => {
  useEffect(() => {
    document.title = 'Campus Guard Attendance System';
  }, []);

  return (
    <AuthProvider>
      <LoginView />
    </AuthProvider>
  );
};

export default Index;
