
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// Default campus coordinates
const CAMPUS_LATITUDE = 22.650206701740068;
const CAMPUS_LONGITUDE = 88.43129649251308;
const DEFAULT_MAX_DISTANCE = 500; // Increased from 300 to 500 meters for better tolerance

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const useGeolocation = () => {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [isWithinCampus, setIsWithinCampus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campusCoordinates, setCampusCoordinates] = useState({
    latitude: CAMPUS_LATITUDE,
    longitude: CAMPUS_LONGITUDE
  });
  const [maxAllowedDistance, setMaxAllowedDistance] = useState(DEFAULT_MAX_DISTANCE);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    const fetchGeolocationSettings = async () => {
      try {
        const settingsRef = doc(firestore, 'settings', 'geolocation');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          
          if (data.centerLatitude && data.centerLongitude) {
            setCampusCoordinates({
              latitude: data.centerLatitude,
              longitude: data.centerLongitude
            });
          }
          
          if (data.radiusInMeters) {
            setMaxAllowedDistance(data.radiusInMeters);
          }
        }
      } catch (err) {
        console.error('Error fetching geolocation settings:', err);
      }
    };
    
    fetchGeolocationSettings();
  }, []);

  // Calculate distance between two coordinates using the Haversine formula
  const getDistanceFromCampus = (position: GeolocationPosition) => {
    const rad = (x: number) => (x * Math.PI) / 180;
    const R = 6371e3; // Earth's radius in meters
    
    const dLat = rad(position.latitude - campusCoordinates.latitude);
    const dLon = rad(position.longitude - campusCoordinates.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(campusCoordinates.latitude)) *
        Math.cos(rad(position.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters
    
    return distance;
  };

  // Check if a position is within campus bounds with more tolerance for accuracy
  const checkLocation = (position: GeolocationPosition, maxDistance = maxAllowedDistance) => {
    const calculatedDistance = getDistanceFromCampus(position);
    setDistance(calculatedDistance);
    
    // Account for GPS accuracy by adding it to the allowed distance
    const adjustedMaxDistance = maxDistance + (position.accuracy / 2);
    const withinCampus = calculatedDistance <= adjustedMaxDistance;
    
    console.log(`Distance to campus: ${calculatedDistance.toFixed(2)}m, Max allowed: ${adjustedMaxDistance.toFixed(2)}m (Including accuracy adjustment), Result: ${withinCampus ? 'Within campus' : 'Outside campus'}`);
    
    setIsWithinCampus(withinCampus);
    return withinCampus;
  };

  // Get current position
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position;
      const locationData = { latitude, longitude, accuracy };
      
      setCurrentLocation(locationData);
      checkLocation(locationData);
      setLoading(false);
    };

    const handleError = (error: any) => {
      setError(`Error getting location: ${error.message}`);
      setLoading(false);
    };

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => handleSuccess({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      }),
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [campusCoordinates, maxAllowedDistance]);

  return { 
    currentLocation, 
    isWithinCampus, 
    loading, 
    error,
    checkLocation,
    campusCoordinates,
    maxAllowedDistance,
    distance
  };
};
