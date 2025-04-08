
import { useState, useEffect, useRef, useCallback } from 'react';
import { getDoc, doc } from 'firebase/firestore'; 
import { firestore } from '@/lib/firebase';

interface GeolocationState {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  error: string | null;
  loading: boolean;
  timestamp: number | null;
  isWatching: boolean;
}

interface GeolocationHookReturn extends GeolocationState {
  requestPermission: () => () => void;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  isWithinCampus: boolean;
  distance: number | null;
  maxAllowedDistance: number;
  checkLocation: () => void;
  requestLocation: () => void;
}

export const useGeolocation = (options?: PositionOptions, watchPosition = false): GeolocationHookReturn => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    timestamp: null,
    isWatching: false
  });
  
  const [isWithinCampus, setIsWithinCampus] = useState<boolean>(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [maxAllowedDistance, setMaxAllowedDistance] = useState<number>(100); // Default 100m
  const [campusCenter, setCampusCenter] = useState({
    latitude: 22.7495, // Default latitude
    longitude: 88.3833, // Default longitude
  });
  
  const watchIdRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 3;
  const retryCount = useRef(0);

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    // Reduce timeout to avoid long waiting periods
    timeout: 10000, // 5 seconds instead of 10
    maximumAge: 0,
    ...options
  };

  // Fetch the campus center and max allowed distance from Firebase
  useEffect(() => {
    const fetchGeolocationSettings = async () => {
      console.log("Fetching geolocation settings...");
      try {
        const settingsRef = doc(firestore, 'settings', 'geolocation');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          
          // Update campus center coordinates
          const newLat = data.latitude || data.centerLatitude || campusCenter.latitude;
          const newLng = data.longitude || data.centerLongitude || campusCenter.longitude;
          
          setCampusCenter({
            latitude: newLat,
            longitude: newLng,
          });
          
          // Update max allowed distance
          const maxDistance = data.maxDistance || data.radiusInMeters || 100;
          setMaxAllowedDistance(maxDistance);
          
          console.log('Geolocation settings loaded:', {
            center: { lat: newLat, lng: newLng },
            maxDistance
          });
        } else {
          console.log('No geolocation settings found, using defaults');
        }
      } catch (error) {
        console.error("Error fetching geolocation settings:", error);
      }
    };
    
    fetchGeolocationSettings();
  }, []);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  }, []);

  const checkLocation = useCallback(() => {
    if (!state.coords) return;
    
    const calculatedDistance = calculateDistance(
      state.coords.latitude,
      state.coords.longitude,
      campusCenter.latitude,
      campusCenter.longitude
    );
    
    console.log('Location check:', {
      userLocation: { lat: state.coords.latitude, lng: state.coords.longitude },
      campusCenter,
      distance: calculatedDistance,
      maxAllowed: maxAllowedDistance,
      isWithin: calculatedDistance <= maxAllowedDistance
    });
    
    setDistance(calculatedDistance);
    setIsWithinCampus(calculatedDistance <= maxAllowedDistance);
    
  }, [state.coords, calculateDistance, maxAllowedDistance, campusCenter]);

  const onSuccess = (position: GeolocationPosition) => {
    console.log('Got location:', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    });
    
    setState({
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      },
      error: null,
      loading: false,
      timestamp: position.timestamp,
      isWatching: !!watchIdRef.current
    });
    retryCount.current = 0; // Reset retry count on success
  };

  const onError = (error: GeolocationPositionError) => {
    console.error("Geolocation error:", error.message);
    
    // Add more detailed error message
    let errorMessage = error.message;
    if (error.code === 1) {
      errorMessage = "Location permission denied. Please enable location in your browser settings.";
    } else if (error.code === 2) {
      errorMessage = "Location unavailable. Please check your device's GPS.";
    } else if (error.code === 3) {
      errorMessage = "Location request timed out. Check your connection and try again.";
    }
    
    // If we haven't exceeded max retries, try again
    if (retryCount.current < maxRetries) {
      retryCount.current++;
      console.log(`Retrying geolocation (attempt ${retryCount.current}/${maxRetries})...`);
      
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        if (watchPosition) {
          // Stop watching and start again
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            onSuccess, 
            onError, 
            defaultOptions
          );
        } else {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            onError,
            defaultOptions
          );
        }
      }, 2000); // Wait 1 second before retry
      
      return;
    }
    
    // If we've exhausted all retries, set the error state
    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false
    }));
  };

  const requestPermission = () => {
    setState(prev => ({ ...prev, loading: true }));
    
    if (watchPosition) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        defaultOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        defaultOptions
      );
    }
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  };

  const requestLocation = useCallback(() => {
    // Force a new location update
    setState(prev => ({ ...prev, loading: true, error: null }));
    retryCount.current = 0; // Reset retry count
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (watchPosition) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        defaultOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        defaultOptions
      );
    }
  }, [watchPosition, defaultOptions]);

  useEffect(() => {
    // Only start if geolocation is available in the browser
    if (!navigator.geolocation) {
      setState({
        coords: null,
        error: 'Geolocation is not supported by your browser',
        loading: false,
        timestamp: null,
        isWatching: false
      });
      return;
    }
    
    // Also directly check permissions to help with debugging
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('Geolocation permission status:', result.state);
        if (result.state === 'denied') {
          setState(prev => ({
            ...prev,
            error: 'Location permission is denied. Please enable it in your browser settings.',
            loading: false
          }));
        } else {
          // If permission is granted or prompt, try to get location
          const cleanup = requestPermission();
        }
      }).catch(error => {
        console.error('Error checking permissions:', error);
        // If we can't check permissions, try to get location anyway
        const cleanup = requestPermission();
      });
    } else {
      // If permissions API is not available, try to get location directly
      const cleanup = requestPermission();
    }
    
    // Periodically refresh location even in watch mode to prevent stale data
    const refreshInterval = setInterval(() => {
      if (watchPosition && state.coords) {
        // Force a new reading occasionally to prevent stale data
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        
        watchIdRef.current = navigator.geolocation.watchPosition(
          onSuccess,
          onError,
          defaultOptions
        );
      }
    }, 60000); // Refresh every minute
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      clearInterval(refreshInterval);
    };
  }, [watchPosition]);

  // Check if within campus whenever coords change
  useEffect(() => {
    checkLocation();
  }, [state.coords, checkLocation]);

  return {
    ...state,
    requestPermission,
    currentLocation: state.coords,
    isWithinCampus,
    distance,
    maxAllowedDistance,
    checkLocation,
    requestLocation
  };
};

// Update getMaxAllowedDistance to match the new implementation
export const getMaxAllowedDistance = async (): Promise<number> => {
  try {
    const settingsRef = doc(firestore, 'settings', 'geolocation');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      // Support both old and new field names
      return data.maxDistance || data.radiusInMeters || 100; // Default to 100m if not set
    }
    
    return 100; // Default value is 100m
  } catch (error) {
    console.error("Error fetching max allowed distance:", error);
    return 100; // Default value in case of error
  }
};

export default useGeolocation;