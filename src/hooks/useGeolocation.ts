
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// Default campus boundary (can be overridden by admin settings)
const DEFAULT_CAMPUS_LOCATION = {
  latitude: 22.6750,
  longitude: 88.4417
};

// Maximum allowed distance in meters (100 meters as requested)
const DEFAULT_MAX_DISTANCE = 100;

export const useGeolocation = () => {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition['coords'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campusLocation, setCampusLocation] = useState(DEFAULT_CAMPUS_LOCATION);
  const [maxAllowedDistance, setMaxAllowedDistance] = useState(DEFAULT_MAX_DISTANCE);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinCampus, setIsWithinCampus] = useState(false);

  // Get geolocation settings from Firestore
  useEffect(() => {
    const fetchGeoSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(firestore, 'settings', 'geolocation'));
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          // Support both old and new field names for backward compatibility
          if ((data.latitude !== undefined && data.longitude !== undefined) || 
              (data.centerLatitude !== undefined && data.centerLongitude !== undefined)) {
            setCampusLocation({
              latitude: data.latitude || data.centerLatitude || DEFAULT_CAMPUS_LOCATION.latitude,
              longitude: data.longitude || data.centerLongitude || DEFAULT_CAMPUS_LOCATION.longitude
            });
          }
          
          // Use admin-defined max distance, but cap it at 100m
          if (data.maxDistance !== undefined || data.radiusInMeters !== undefined) {
            const maxDistance = Math.min(data.maxDistance || data.radiusInMeters || DEFAULT_MAX_DISTANCE, 100);
            setMaxAllowedDistance(maxDistance);
          } else {
            setMaxAllowedDistance(DEFAULT_MAX_DISTANCE);
          }
        }
      } catch (error) {
        console.error("Error fetching geolocation settings:", error);
      }
    };
    
    fetchGeoSettings();
  }, []);

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Check if user is within campus boundary
  const checkLocation = (position: GeolocationPosition) => {
    setCurrentLocation(position.coords);
    
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;
    
    const calculatedDistance = calculateDistance(
      userLat, userLng,
      campusLocation.latitude, campusLocation.longitude
    );
    
    setDistance(calculatedDistance);
    setIsWithinCampus(calculatedDistance <= maxAllowedDistance);
    setLoading(false);
  };

  // Get current position and set up watching
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      position => {
        checkLocation(position);
      },
      err => {
        setError(`Error getting location: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
    
    // Watch position
    const watchId = navigator.geolocation.watchPosition(
      position => {
        checkLocation(position);
      },
      err => {
        setError(`Error tracking location: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
    
    // Cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [campusLocation, maxAllowedDistance]);

  return {
    currentLocation,
    loading,
    error,
    isWithinCampus,
    distance,
    maxAllowedDistance,
    checkLocation
  };
};