import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Text, View, TouchableOpacity, Linking, StyleSheet, Alert, Pressable, Image, Platform } from "react-native";
import { DriverDetailsStore, useLocationStore, useUserStore } from "@/store";
import { arrayUnion, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../app/(auth)/firebase";
import { icons } from "@/constants";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";

const WebFallback = () => null;

// Conditional imports based on platform
export const MapView = Platform.select({
  ios: () => require('react-native-maps').default,
  android: () => require('react-native-maps').default,
  default: () => WebFallback,
})();

export const Marker = Platform.select({
  ios: () => require('react-native-maps').Marker,
  android: () => require('react-native-maps').Marker,
  default: () => WebFallback,
})();

export const Polyline = Platform.select({
  ios: () => require('react-native-maps').Polyline,
  android: () => require('react-native-maps').Polyline,
  default: () => WebFallback,
})();

export const PROVIDER_DEFAULT = Platform.select({
  ios: () => require('react-native-maps').PROVIDER_DEFAULT,
  android: () => require('react-native-maps').PROVIDER_DEFAULT,
  default: () => null,
})();


const ORS_API_KEY = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";

const CATEGORY_RATES = {
  Economy: 65,
  XL: 85,
  MotorBike: 45,
  Premium: 140,
} as const;

interface LocationData {
  driverLatitude: number;
  driverLongitude: number;
  customerLatitude: number;
  customerLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress: number;
  startAddress: number;

}

interface CustomerDetails {
  phone: string;
  name: string;
  email: string;
}

interface LiveLocation {
  latitude: number;
  longitude: number;
}

const MapScreen = ({ setModalVisible}) => {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number; longitude: number}>>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routesLoaded, setRoutesLoaded] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [chargingAmount, setChargingAmount] = useState<number>(0);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const { driver, setDriver } = DriverDetailsStore(); // Fetch and set driver details
  const { user } = useUserStore();
  const { userLongitude, userLatitude, setUserLocation } = useLocationStore();
  const [duration, setDuration] = useState<number>(0);
  const [formattedDuration, setFormattedDuration] = useState<string>('');
const [distance,setDistance]=useState(0)

  useEffect(() => {
    if (routeCoordinates.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [routeCoordinates]);

  const mapRef = useRef<MapView | null>(null);

  const [liveLocation, setLiveLocation] = useState<LiveLocation>({
    latitude: userLatitude || 0,
    longitude: userLongitude || 0
  });

  // Initialize location tracking
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync(location.coords);

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: `${address[0]?.name}, ${address[0]?.region}`,
        });
      } catch (error) {
        console.error("Error initializing location:", error);
        Alert.alert("Error", "Failed to get location");
      }
    };

    initializeLocation();
  }, []);

  // Listen for ride notifications
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "driverNotifications", user.uid),
      (doc) => {
        if (doc.exists()) {
          const rideData = doc.data();
          const locations: LocationData = {
            driverLatitude: userLatitude || 0,
            driverLongitude: userLongitude || 0,
            customerLatitude: parseFloat(rideData.startLatitude),
            customerLongitude: parseFloat(rideData.startLongitude),
            destinationLatitude: parseFloat(rideData.destinationLatitude),
            destinationLongitude: parseFloat(rideData.destinationLongitude),
            
            startAddress:rideData.startAddress,
            destinationAddress:rideData.destinationAddress,
          };
          
          setLocationData(locations);
          setSelectedRide(rideData);

        }
      },
      (error) => {
        console.error("Error fetching driver notifications:", error);
        Alert.alert("Error", "Failed to fetch ride details");
      }
    );

    return () => unsubscribe();
  }, [user, userLatitude, userLongitude]);

  // Monitor live location
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "driverLocations", user.uid),
      (doc) => {
        if (doc.exists()) {
          const locationData = doc.data();
          setLiveLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude
          });
          // fetchRoute();
        }
      },
      (error) => {
        console.error("Error fetching driver location:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch customer details and route when location data changes
  useEffect(() => {
    if (locationData && selectedRide?.rideId) {
      fetchCustomerDetails();
      setTimeout(() => {
        fetchRoute();
      }, 1000);
    }
  }, [locationData, selectedRide]);

  const fetchCustomerDetails = async () => {
    if (!selectedRide?.rideId) return;

    try {
      const userDoc = await getDoc(doc(db, "users", selectedRide.rideId));
      if (userDoc.exists()) {
        setCustomerDetails(userDoc.data() as CustomerDetails);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
      Alert.alert("Error", "Failed to fetch customer details");
    }
  };

  const fetchRoute = async () => {
    if (!locationData || !driver?.category) return;

    try {
      setLoadingRoute(true);
      setRoutesLoaded(false);

      // Parse coordinates and ensure they are numbers
      const startCoords = {
        latitude: parseFloat(locationData.customerLatitude.toString()),
        longitude: parseFloat(locationData.customerLongitude.toString())
      };

      const endCoords = {
        latitude: parseFloat(locationData.destinationLatitude.toString()),
        longitude: parseFloat(locationData.destinationLongitude.toString())
      };

      // Debug log
      console.log('Parsed coordinates:', {
        start: startCoords,
        end: endCoords
      });

      // Validate all coordinates
      if (!isValidCoordinate(startCoords.latitude, startCoords.longitude) ||
          !isValidCoordinate(endCoords.latitude, endCoords.longitude)) {
        console.error('Invalid coordinates:', { startCoords, endCoords });
        throw new Error('Invalid coordinates. Please check location data.');
      }

      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords.longitude},${startCoords.latitude}&end=${endCoords.longitude},${endCoords.latitude}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.features?.[0]?.geometry?.coordinates) {
        throw new Error('No route found');
      }

      const coordinates = data.features[0].geometry.coordinates.map(
        ([longitude, latitude]: number[]) => ({ latitude, longitude })
      );
      
      // Calculate total distance and fare
      const distanceInKm = data.features[0].properties.segments[0].distance / 1000;
      setDistance(distanceInKm);

      // Get duration in minutes
      const durationInMinutes = Math.round(data.features[0].properties.segments[0].duration / 60);
      setDuration(durationInMinutes);

      // Format duration
      const hours = Math.floor(durationInMinutes / 60);
      const minutes = durationInMinutes % 60;
      const formattedDuration = hours > 0 
        ? `${hours} hr ${minutes} min`
        : `${minutes} min`;
      setFormattedDuration(formattedDuration);

      const rate = CATEGORY_RATES[driver.category as keyof typeof CATEGORY_RATES] || 65;
      const fare = distanceInKm * rate;
      const finalFare = Math.max(fare, 250);
      const roundedFare = Math.round(finalFare / 10) * 10;
      
      setChargingAmount(roundedFare);
      setRouteCoordinates(coordinates);
      setRoutesLoaded(true);

    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert(
        'Route Error',
        'Unable to fetch route. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingRoute(false);
      setLoadingData(false);
    }
  };

  // Helper function to validate coordinates
  const isValidCoordinate = (lat: number, lon: number) => {
    return (
      typeof lat === 'number' && 
      typeof lon === 'number' && 
      !isNaN(lat) && 
      !isNaN(lon) && 
      lat >= -90 && 
      lat <= 90 && 
      lon >= -180 && 
      lon <= 180
    );
  };

  // Modify the loading condition
  if (loadingData || loadingRoute || !routesLoaded) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  
  // Also add a check for route coordinates
  if (!locationData || routeCoordinates.length === 0) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <Text>Loading route information...</Text>
      </View>
    );
  }
  const acceptRide = async () => {
    const uniqueRideId = `${user.uid}_${selectedRide.rideId}`;
console.log(locationData);

    try {
      await updateDoc(doc(db, "driverNotifications", user.uid.toString()), {
        status: "accepted",
        uid: user.uid,
        confirmedAt: new Date().toISOString(),
        customerDetails,
        fare: Math.round(chargingAmount / 10) * 10,
        category: driver?.category,
        completedAt: null,
        distance: distance,
        duration: formattedDuration,
      });
      
       await setDoc(doc(db, "driverRides", uniqueRideId.toString()), {
        status: "accepted",
        uid: user.uid,
        confirmedAt: new Date().toISOString(),
        customerDetails,
        fare: Math.round(chargingAmount / 10) * 10,
        category: driver?.category,
        completedAt: null,
        distance: distance,
        duration: formattedDuration,
        location:locationData
      
       });
     saveRide()
    } catch (error) {
      console.error("Error accepting ride:", error);
      Alert.alert("Error", "Failed to accept ride");
    }
  };

  const saveRide = async () => {
    const uniqueRideId = `${user.uid}_${selectedRide.rideId}`;
    const driverRidesDocRef = doc(db, "driverRides", user.uid);
  
    try {
      // Get the current driver rides array
      const driverRidesSnapshot = await getDoc(driverRidesDocRef);
      const existingRides = driverRidesSnapshot.exists()
        ? driverRidesSnapshot.data().rides || [] // Use existing rides array if it exists
        : [];
  
      // Create the new ride object
      const newRide = {
        rideId: uniqueRideId,
        status: "accepted",
        uid: user.uid,
        confirmedAt: new Date().toISOString(),
        customerDetails,
        fare: Math.round(chargingAmount / 10) * 10,
        category: driver?.category,
        completedAt: null,
        distance: distance,
        duration: formattedDuration,
        location: locationData,
      };
  
      // Add the new ride to the array
      const updatedRides = [...existingRides, newRide];
  
      // Save the updated array back to the database
      await setDoc(driverRidesDocRef, { rides: updatedRides });
  
      setModalVisible(false);
      router.push("/driverMaps");
    } catch (error) {
      console.error("Error accepting ride:", error);
      Alert.alert("Error", "Failed to accept ride");
    }
  };
  

 
  return (
    <View style={{ flex: 1 }}>
        <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
      >
        {/* Fix the driver marker coordinates */}
        <Marker
    coordinate={{
                latitude: locationData.driverLatitude,
                longitude: locationData.driverLongitude,
              }}
          title="Driver"
          image={icons.selectedMarker}
        />
        {locationData && (
          <>
            <Marker
              coordinate={{
                latitude: locationData.customerLatitude,
                longitude: locationData.customerLongitude,
              }}
              title="Customer"
            />
            <Marker
              coordinate={{
                latitude: locationData.destinationLatitude,
                longitude: locationData.destinationLongitude,
              }}
              title="Destination"
            />
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#4CAF50"
                strokeWidth={4}
              />
            )}
          </>
        )}
      </MapView>




      {driver?.category && (
     <View className="bg-white  mx-2 my-3 p-4 rounded-xl shadow">
     <View className="flex-row justify-between items-center">
       <View className="flex-1">
         <Text className="text-xl font-bold text-gray-800">Ride Details</Text>
         <View className="mt-1 bg-green-50 self-start px-3 py-1 rounded-full flex-row items-center">
           <MaterialIcons name="local-taxi" size={16} color="#4CAF50" />
           <Text className="text-green-600 font-semibold ml-1 text-sm">
             {driver.category}
           </Text>
         </View>
       </View>
       
       <View className="items-end">
         <Text className="text-2xl font-bold text-gray-800">
           {`Ksh ${Math.round(chargingAmount / 10) * 10}/=`}
         </Text>
         <Text className="text-sm text-gray-500">
           Rate: {CATEGORY_RATES[driver.category as keyof typeof CATEGORY_RATES]}/km
         </Text>
         <Text className="text-sm text-gray-500">
           Route Distance: {distance} km
         </Text>
       </View>
     </View>
   </View>
      )}
     <View className="flex flex-col w-full items-start justify-center mt-2 px-5 ">
          <View className="flex flex-row items-center justify-start mt-3 border-t bordger-b border-general-700 w-full py-3">
            <Image source={icons.to} className="w-6 h-6" />
            <Text className="text-lg font-JakartaBold ml-2">
              {locationData.destinationAddress}
            </Text>
          </View>

          <View className="flex flex-row items-center justify-start bordher-b border-general-700 w-full py-3">
            <Image source={icons.point} className="w-6 h-6" />
            <Text className="text-lg font-JakartaBold ml-2">
              {locationData.startAddress}
            </Text>
          </View>
        </View>
       <View className="flex-row justify-between px-6 mt-16 mb-20">
         <Pressable
           onPress={()=>{acceptRide()}}
           className="flex-1 bg-green-500 p-3 rounded-lg mr-2 flex-row items-center justify-center"
         >
           <MaterialIcons name="check-circle" size={20} color="white" />
           <Text className="text-white text-center font-medium ml-2">Accept Ride</Text>
         </Pressable>
         <Pressable
           onPress={() => setModalVisible(false)}
           className="flex-1 bg-gray-200 p-3 rounded-lg flex-row items-center justify-center"
         >
           <MaterialIcons name="cancel" size={20} color="#6B7280" />
           <Text className="text-gray-700 text-center font-medium ml-2">Cancel</Text>
         </Pressable>
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSection: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  callButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MapScreen;