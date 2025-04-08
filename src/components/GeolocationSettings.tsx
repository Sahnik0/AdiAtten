
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, MapPin, Settings, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GeolocationSettings = () => {
  const [centerLatitude, setCenterLatitude] = useState(22.6288); // Default Adamas University coordinates
  const [centerLongitude, setCenterLongitude] = useState(88.4682);
  const [radiusInMeters, setRadiusInMeters] = useState(50); // Default 50m radius
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have location permission
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setHasLocationPermission(result.state !== 'denied');
      }).catch(() => {
        // If we can't check permissions, assume we have them
        setHasLocationPermission(true);
      });
    }
    
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(firestore, 'settings', 'geolocation');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          console.log("Loaded geolocation settings:", data);
          
          // Ensure we're getting the correct values
          setCenterLatitude(data.latitude || data.centerLatitude || 22.6288);
          setCenterLongitude(data.longitude || data.centerLongitude || 88.4682);
          
          // Ensure radius is within min and max bounds (10-100m)
          const radius = Math.min(Math.max(data.maxDistance || data.radiusInMeters || 50, 10), 100);
          setRadiusInMeters(radius);
        }
      } catch (error) {
        console.error("Error fetching geolocation settings:", error);
      }
    };
    
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      // Ensure radius is within allowed range (10-100m) before saving
      const finalRadius = Math.min(Math.max(radiusInMeters, 10), 100);
      
      const settingsData = {
        latitude: Number(centerLatitude),
        longitude: Number(centerLongitude),
        maxDistance: Number(finalRadius),
        // Keep backward compatibility
        centerLatitude: Number(centerLatitude),
        centerLongitude: Number(centerLongitude),
        radiusInMeters: Number(finalRadius),
        updatedAt: new Date().toISOString()
      };
      
      console.log("Saving geolocation settings:", settingsData);
      
      await setDoc(doc(firestore, 'settings', 'geolocation'), settingsData);
      
      setRadiusInMeters(finalRadius);
      
      toast({
        title: "Settings Saved",
        description: "Geolocation settings have been updated.",
      });
    } catch (error) {
      console.error("Error saving geolocation settings:", error);
      toast({
        title: "Error",
        description: "Failed to save geolocation settings.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Got current location:", {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          
          setCenterLatitude(position.coords.latitude);
          setCenterLongitude(position.coords.longitude);
          
          toast({
            title: "Location Updated",
            description: "Current location has been set.",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Geolocation Error",
            description: error.message,
            variant: "destructive",
          });
          
          if (error.code === 1) {
            setHasLocationPermission(false);
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Geolocation Settings
        </CardTitle>
        <CardDescription>
          Configure campus boundaries for attendance verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasLocationPermission && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Location permission is blocked. Please enable location access in your browser settings.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="centerLatitude">Latitude</Label>
            <div className="flex space-x-2">
              <Input
                id="centerLatitude"
                type="number"
                step="0.000001"
                value={centerLatitude}
                onChange={(e) => setCenterLatitude(parseFloat(e.target.value))}
                placeholder="Campus latitude"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="centerLongitude">Longitude</Label>
            <div className="flex space-x-2">
              <Input
                id="centerLongitude"
                type="number"
                step="0.000001"
                value={centerLongitude}
                onChange={(e) => setCenterLongitude(parseFloat(e.target.value))}
                placeholder="Campus longitude"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="radiusSlider">Radius: {radiusInMeters} meters</Label>
            <span className="text-xs text-muted-foreground">
              {radiusInMeters}m
            </span>
          </div>
          <Slider
            id="radiusSlider"
            min={10}
            max={100}
            step={5}
            value={[radiusInMeters]}
            onValueChange={(value) => setRadiusInMeters(value[0])}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Students must be within this radius to mark attendance (min: 10m, max: 100m)
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <Button 
            onClick={getCurrentLocation} 
            variant="outline"
            disabled={!hasLocationPermission}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Use Current Location
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Sets the center point to your current location
          </p>
        </div>

        <Button 
          onClick={handleSaveSettings}
          disabled={isSubmitting}
          className="w-full gradient-bg"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GeolocationSettings;