import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, Mail, KeyRound, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Email validation
  useEffect(() => {
    if (email) {
      const validDomains = ['stu.adamasuniversity.ac.in', 'adamasuniversity.ac.in'];
      const emailParts = email.split('@');
      setEmailValid(emailParts.length > 1 && validDomains.includes(emailParts[1]));
    } else {
      setEmailValid(true); // Don't show error when field is empty
    }
  }, [email]);
  
  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      showNotification('Successfully signed in!', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to sign in. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!emailValid) {
      showNotification('Please use a valid university email address', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      await register(email, password, displayName, rollNumber);
      showNotification('Registration successful! Please verify your email.', 'success');
      setActiveTab('signin');
    } catch (error) {
      showNotification(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      await sendVerificationEmail();
      showNotification('Verification email sent!', 'success');
    } catch (error) {
      showNotification('Failed to send verification email', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="relative">
      <Card className="w-full max-w-md mx-auto shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl">
        {/* Background decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full opacity-50" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100 rounded-full opacity-50" />
        
        {/* Notification */}
        {notification.show && (
          <div 
            className={`absolute top-4 left-0 right-0 mx-auto w-5/6 z-50 ${
              notification.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 
              'bg-red-100 text-red-800 border-red-200'
            } py-2 px-4 rounded-md shadow-md border text-sm flex items-center justify-between transition-all duration-300`}
          >
            <span className="flex items-center">
              {notification.type === 'success' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              {notification.message}
            </span>
            <button 
              onClick={() => setNotification({ show: false, message: '', type: '' })}
              className="text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}
        
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text inline-block">
              Campus Attendance
            </CardTitle>
          </div>
          <CardDescription className="text-center">
            Sign in with your university Outlook email
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          {/* Show email verification alert if needed */}
          {currentUser && !currentUser.emailVerified && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800 flex items-center justify-between">
                <span>Please verify your email address before marking attendance.</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-amber-800 underline whitespace-nowrap"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Resend verification'
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="signin" className="relative">
                Sign In
                {activeTab === 'signin' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </TabsTrigger>
              <TabsTrigger value="register" className="relative">
                Register
                {activeTab === 'register' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <div className="transition-opacity duration-300">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="flex items-center">
                      <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                      Email
                    </Label>
                    <div className="relative">
                      <Input 
                        id="email"
                        type="email" 
                        placeholder="university@stu.adamasuniversity.ac.in" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className={`pr-8 ${!emailValid && email ? 'border-red-300 focus:ring-red-500' : ''}`}
                      />
                      {!emailValid && email && (
                        <AlertCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {!emailValid && email && (
                      <p className="text-xs text-red-500 mt-1">
                        Please use your university email address
                      </p>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="flex items-center">
                        <KeyRound className="h-3 w-3 mr-1 text-muted-foreground" />
                        Password
                      </Label>
                      <Button 
                        variant="link" 
                        className="px-0 font-normal h-auto text-xs"
                        onClick={() => setShowForgotPassword(true)}
                        type="button"
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="transition-opacity duration-300">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="register-email" className="flex items-center">
                      <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                      Email <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input 
                        id="register-email"
                        type="email" 
                        placeholder="university@stu.adamasuniversity.ac.in" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className={`pr-8 ${!emailValid && email ? 'border-red-300 focus:ring-red-500' : ''}`}
                      />
                      {!emailValid && email && (
                        <AlertCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {!emailValid && email && (
                      <p className="text-xs text-red-500 mt-1">
                        Please use your university email address
                      </p>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="display-name" className="flex items-center">
                      <UserPlus className="h-3 w-3 mr-1 text-muted-foreground" />
                      Full Name <span className="text-red-500 ml-1">*</span>
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
                      Roll Number <span className="text-red-500 ml-1">*</span>
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
                    <Label htmlFor="register-password" className="flex items-center">
                      <KeyRound className="h-3 w-3 mr-1 text-muted-foreground" />
                      Password <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input 
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {password && (
                      <>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div 
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                passwordStrength >= level 
                                  ? level === 1 ? 'bg-red-500' 
                                  : level === 2 ? 'bg-orange-500' 
                                  : level === 3 ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {passwordStrength === 0 && 'Very weak password'}
                          {passwordStrength === 1 && 'Weak password'}
                          {passwordStrength === 2 && 'Moderate password'}
                          {passwordStrength === 3 && 'Strong password'}
                          {passwordStrength === 4 && 'Very strong password'}
                        </p>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  
                  <div className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all text-white" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Register
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Fields marked with <span className="text-red-500">*</span> are required
                  </p>
                </form>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col items-center justify-center space-y-2 mt-6 transition-opacity duration-300">
            <div className="rounded-full bg-blue-100 p-3 transition-transform duration-300 hover:scale-110 hover:rotate-6">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
            
            <p className="text-center text-muted-foreground text-sm">
              Login is restricted to Adamas University emails only.<br />
              <span className="text-xs">(@stu.adamasuniversity.ac.in or @adamasuniversity.ac.in)</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;