import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Animated, Image, Platform } from "react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { useDriverStore, useLocationStore } from "@/store";
import { icons } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Move constants outside component
const orsAPIKey = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";
const LOCATION_UPDATE_INTERVAL = 10000;

const MapView = Platform.select({
  android: () => require('react-native-maps').default,
  ios: () => require('react-native-maps').default,
  default: () => {
    return (props: any) => (
      <View className="flex justify-center items-center w-full h-full">
        <Text>Map not supported on this platform</Text>
      </View>
    );
  }
})();

const { Marker, PROVIDER_DEFAULT, Polyline } = Platform.select({
  android: () => require('react-native-maps'),
  ios: () => require('react-native-maps'),
  default: () => {
    return (props: any) => (
      <View className="flex justify-center items-center w-full h-full">
        <Text>Map not supported on this platform</Text>
      </View>
    );
  }
})();

const fetchRouteData = async (startLon: number, startLat: number, destLon: number, destLat: number) => {
  try {
    if (!startLat || !startLon || !destLat || !destLon || 
        startLat < -90 || startLat > 90 || destLat < -90 || destLat > 90 ||
        startLon < -180 || startLon > 180 || destLon < -180 || destLon > 180) {
      console.error("Invalid coordinates:", { startLat, startLon, destLat, destLon });
      return null;
    }

    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?` + 
      `api_key=${orsAPIKey}` +
      `&start=${startLon},${startLat}` +
      `&end=${destLon},${destLat}`,
      {
        headers: {
          'Accept': 'application/json, application/geo+json',
          'Content-Type': 'application/json',
          'Authorization': orsAPIKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Route API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
};

const Map = React.memo(() => {
  const locationStore = useLocationStore();
  const driverStore = useDriverStore();
  
  const mapRef = useRef<any>(null);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState({
    routeCoordinates: [] as any[],
    routeTimes: null as string | null,
    loadingRoute: false,
    liveloc: null as any,
  });

  const locationValues = useMemo(() => ({
    startLatitude: locationStore.pickUpLatitude || state.liveloc?.latitude,
    startLongitude: locationStore.pickUpLongitude || state.liveloc?.longitude,
    startAddress: locationStore.pickUpAddress || locationStore.userAddress,
  }), [
    locationStore.pickUpLatitude,
    locationStore.pickUpLongitude,
    locationStore.pickUpAddress,
    locationStore.userAddress,
    state.liveloc
  ]);

  const pulseAnimation = useMemo(() => 
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ), [scaleValue]);

  useEffect(() => {
    const timer = setTimeout(() => pulseAnimation.start(), 5000);
    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [pulseAnimation]);

  const getStoredLocation = useCallback(async () => {
    try {
      const locationData = await AsyncStorage.getItem('userLocation');
      if (locationData) {
        const newLocation = JSON.parse(locationData);
        setState(prev => {
          if (JSON.stringify(prev.liveloc) === JSON.stringify(newLocation)) {
            return prev;
          }
          return { ...prev, liveloc: newLocation };
        });
      }
    } catch (error) {
      console.error("Error retrieving location:", error);
    }
  }, []);

  useEffect(() => {
    getStoredLocation();
    locationIntervalRef.current = setInterval(getStoredLocation, LOCATION_UPDATE_INTERVAL);
    
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [getStoredLocation]);

  useEffect(() => {
    const fetchRouteAndUpdate = async () => {
      if (!locationValues.startLatitude || !locationValues.startLongitude || 
          !locationStore.destinationLatitude || !locationStore.destinationLongitude) {
        return;
      }

      setState(prev => ({ ...prev, loadingRoute: true }));

      try {
        const routeData = await fetchRouteData(
          locationValues.startLongitude,
          locationValues.startLatitude,
          locationStore.destinationLongitude,
          locationStore.destinationLatitude
        );

        if (routeData?.features?.[0]) {
          const coordinates = routeData.features[0].geometry.coordinates.map(
            ([longitude, latitude]: [number, number]) => ({ latitude, longitude })
          );

          const timeInSeconds = routeData.features[0].properties.segments[0].duration;
          const hours = Math.floor(timeInSeconds / 3600);
          const minutes = Math.floor((timeInSeconds % 3600) / 60);
          const seconds = Math.floor(timeInSeconds % 60);
          const formattedTime = `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`;

          setState(prev => ({
            ...prev,
            routeCoordinates: coordinates,
            routeTimes: formattedTime,
            loadingRoute: false
          }));
        } else {
          setState(prev => ({ ...prev, loadingRoute: false }));
        }
      } catch (error) {
        console.error("Error processing route:", error);
        setState(prev => ({ ...prev, loadingRoute: false }));
      }
    };

    fetchRouteAndUpdate();
  }, [
    locationValues.startLatitude,
    locationValues.startLongitude,
    locationStore.destinationLatitude,
    locationStore.destinationLongitude
  ]);

  const mapRegion = useMemo(() => {
    if (locationStore.destinationLatitude && locationStore.destinationLongitude) {
      return {
        latitude: locationStore.destinationLatitude,
        longitude: locationStore.destinationLongitude,
        latitudeDelta: 0.0085,
        longitudeDelta: 0.0085,
      };
    }
    return {
      latitude: locationValues.startLatitude,
      longitude: locationValues.startLongitude,
      latitudeDelta: 0.00075,
      longitudeDelta: 0.00075,
    };
  }, [
    locationStore.destinationLatitude,
    locationStore.destinationLongitude,
    locationValues.startLatitude,
    locationValues.startLongitude,
  ]);

  const driverMarkers = useMemo(() => 
    driverStore.drivers.map((marker) => (
      <Marker
        key={marker.id}
        coordinate={{
          latitude: marker.latitude,
          longitude: marker.longitude,
        }}
        title={marker.username}
        image={driverStore.selectedDriver === marker.uid ? icons.selectedMarker : icons.marker}
      />
    )), [driverStore.drivers, driverStore.selectedDriver]);

  const locationMarker = useMemo(() => (
    <Marker
      coordinate={{ 
        latitude: locationValues.startLatitude, 
        longitude: locationValues.startLongitude 
      }}
      title={locationStore.pickUpLatitude ? "Pickup Location" : "You are here"}
    >
      <Animated.Image
        source={icons.person}
        style={{
          width: 60,
          height: 60,
          marginBottom: 10,
          zIndex: 10000,
          resizeMode: "contain",
          transform: [{ scale: scaleValue }],
        }}
      />
    </Marker>
  ), [locationValues.startLatitude, locationValues.startLongitude, locationStore.pickUpLatitude, scaleValue]);

  const destinationMarker = useMemo(() => (
    locationStore.destinationLatitude && locationStore.destinationLongitude ? (
      <Marker
        coordinate={{
          latitude: locationStore.destinationLatitude,
          longitude: locationStore.destinationLongitude,
        }}
        title="Destination"
      >
        <Image
          source={icons.pin}
          style={{
            width: 60,
            height: 60,
          }}
        />
      </Marker>
    ) : null
  ), [locationStore.destinationLatitude, locationStore.destinationLongitude]);

  const routePolyline = useMemo(() => (
    state.routeCoordinates.length > 0 ? (
      <Polyline
        coordinates={state.routeCoordinates}
        strokeColor="#0286FF"
        strokeWidth={3}
      />
    ) : null
  ), [state.routeCoordinates]);

  if (state.loadingRoute || !locationValues.startLatitude || !locationValues.startLongitude) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      className="w-full h-full rounded-2xl"
      initialRegion={mapRegion}
      showsUserLocation={true}
      userInterfaceStyle="light"
    >
      {driverMarkers}
      {locationMarker}
      {destinationMarker}
      {routePolyline}
    </MapView>
  );
});

Map.displayName = 'Map';

export default Map;