
import { useAuth } from '@/hooks/useAuth';
import LoginForm from './LoginForm';
import Dashboard from './Dashboard';
import Header from './Header';
import Footer from './Footer';
import { Loader2 } from 'lucide-react';

const LoginView = () => {
  const { currentUser, loading, deviceVerificationLoading, isDeviceVerified } = useAuth();

  if (loading || deviceVerificationLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <Header />
      
      <main className="flex-grow p-4">
        <div className="container max-w-6xl mx-auto py-4 md:py-8">
          {!currentUser ? (
            <div className="mt-2 md:mt-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                Campus Guard Attendance
              </h1>
              <p className="text-center text-muted-foreground mb-8">Secure attendance tracking with location verification</p>
              <LoginForm />
            </div>
          ) : (
            <Dashboard />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default LoginView;
