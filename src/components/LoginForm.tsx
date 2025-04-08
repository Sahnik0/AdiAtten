import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, Mail, KeyRound } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import ForgotPassword from '../components/ForgotPassword.tsx';

const LoginForm = () => {
  const { signIn, register, sendVerificationEmail, currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(email, password);
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await register(email, password, displayName, rollNumber);
    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    await sendVerificationEmail();
    setIsLoading(false);
  };

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Campus Attendance</CardTitle>
        <CardDescription className="text-center">
          Sign in with your university Outlook email
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Show email verification alert if needed */}
        {currentUser && !currentUser.emailVerified && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              Please verify your email address before marking attendance.
              <Button
                variant="link"
                className="p-0 ml-1 h-auto text-amber-800 underline"
                onClick={handleResendVerification}
              >
                Resend verification email
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="university@stu.adamasuniversity.ac.in" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button 
                    variant="link" 
                    className="px-0 font-normal h-auto text-xs"
                    onClick={() => setShowForgotPassword(true)}
                    type="button"
                  >
                    Forgot password?
                  </Button>
                </div>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full gradient-bg hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="register-email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="register-email"
                  type="email" 
                  placeholder="university@stu.adamasuniversity.ac.in" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="display-name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="display-name"
                  type="text" 
                  placeholder="Your Name" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="roll-number">
                  Roll Number <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="roll-number"
                  type="text" 
                  placeholder="Your Roll Number eg.88" 
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="register-password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="register-password"
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>
              
              <Button 
                type="submit"
                className="w-full gradient-bg hover:shadow-lg transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-2">
                Fields marked with <span className="text-red-500">*</span> are required
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col items-center justify-center space-y-2 mt-4">
          <div className="rounded-full bg-blue-100 p-3">
            <KeyRound className="h-6 w-6 text-blue-600" />
          </div>
          
          <p className="text-center text-muted-foreground text-sm">
            Login is restricted to Adamas University emails only.<br />
            <span className="text-xs">(@stu.adamasuniversity.ac.in or @adamasuniversity.ac.in)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;