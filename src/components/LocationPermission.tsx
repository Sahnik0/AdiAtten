
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/hooks/use-toast';
import { MapPin, AlertTriangle, CheckCircle, RefreshCw, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LocationPermission = () => {
  const [showCard, setShowCard] = useState(true);
  const { currentLocation, loading, error, isWithinCampus, distance, maxAllowedDistance, requestLocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 5000, // Reduced timeout to 5 seconds
    maximumAge: 0
  });
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<string | null>(null);

  // Check if permissions are already granted
  useEffect(() => {
    if (currentLocation) {
      setShowCard(false);
    }
    
    // Check current permission state
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state);
        console.log('Current geolocation permission state:', result.state);
        
        // Listen for permission changes
        result.onchange = () => {
          console.log('Permission state changed to:', result.state);
          setPermissionState(result.state);
          
          if (result.state === 'granted') {
            requestLocation();
            setShowCard(false);
          } else if (result.state === 'denied') {
            setShowCard(true);
          }
        };
      }).catch(err => {
        console.error('Error querying permissions:', err);
      });
    }
  }, [currentLocation, requestLocation]);

  const requestPermission = async () => {
    try {
      if (navigator.geolocation) {
        if ('permissions' in navigator) {
          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'granted') {
              setShowCard(false);
              toast({
                title: "Location Access Granted",
                description: "Your location will be used for attendance verification.",
              });
              requestLocation();
            } else if (result.state === 'prompt') {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setShowCard(false);
                  toast({
                    title: "Location Access Granted",
                    description: "Your location will be used for attendance verification.",
                  });
                  // Force a location request to update the UI
                  requestLocation();
                },
                (err) => {
                  console.error('Geolocation error:', err.message);
                  toast({
                    title: "Location Access Denied",
                    description: "You must allow location access to mark attendance.",
                    variant: "destructive",
                  });
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
              );
            } else if (result.state === 'denied') {
              toast({
                title: "Location Access Denied",
                description: "Please enable location access in your browser settings.",
                variant: "destructive",
              });
            }
          });
        } else {
          // Fallback for browsers without Permissions API
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setShowCard(false);
              toast({
                title: "Location Access Granted",
                description: "Your location will be used for attendance verification.",
              });
              // Force a location request to update the UI
              requestLocation();
            },
            (err) => {
              console.error('Geolocation error:', err.message);
              toast({
                title: "Location Access Denied",
                description: "You must allow location access to mark attendance.",
                variant: "destructive",
              });
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        }
      } else {
        toast({
          title: "Geolocation Not Supported",
          description: "Your browser does not support geolocation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      // If permissions API fails, try direct geolocation
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setShowCard(false);
          toast({
            title: "Location Access Granted",
            description: "Your location will be used for attendance verification.",
          });
          requestLocation();
        },
        (err) => {
          console.error('Geolocation error:', err.message);
          toast({
            title: "Location Access Denied",
            description: "You must allow location access to mark attendance.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  if (!showCard) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            {isWithinCampus ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Location Verified
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                Location Outside Campus
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            {currentLocation && (
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  Your current distance from campus: <span className="font-medium">{Math.round(distance || 0)} meters</span>
                </p>
                <p className="text-muted-foreground">
                  Maximum allowed distance: <span className="font-medium">{maxAllowedDistance} meters</span>
                </p>
                <p className={isWithinCampus ? "text-green-600" : "text-amber-600"}>
                  {isWithinCampus 
                    ? "You are within the campus boundaries." 
                    : "You need to be within campus boundaries to mark attendance."}
                </p>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="mt-3">
              <Button 
                onClick={requestLocation} 
                variant="outline"
                size="sm"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Location
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Location Permission Required</CardTitle>
        <CardDescription>
          Your location is needed to verify your presence on campus for attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionState === 'denied' && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4 mr-2" />
            <AlertDescription>
              Location permission is blocked. Please enable location access in your browser settings,
              then refresh this page.
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={requestPermission} 
          className="w-full"
          disabled={loading || permissionState === 'denied'}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {loading ? "Requesting..." : "Allow Location Access"}
        </Button>
        
        {permissionState === 'denied' && (
          <div className="text-sm text-muted-foreground mt-2">
            <p>How to enable location:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Location" and change it to "Allow"</li>
              <li>Refresh this page after enabling location</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationPermission;