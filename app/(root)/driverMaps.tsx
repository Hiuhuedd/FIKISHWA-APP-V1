import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Text, View, TouchableOpacity, Linking, StyleSheet, Alert, Platform } from "react-native";
import { MapViewProps } from 'react-native-maps';
import { useLocationStore, useUserStore } from "@/store";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../(auth)/firebase";
import { icons } from "@/constants";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

const orsAPIKey = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";

let MapView: any;
let Marker: any;
let PROVIDER_DEFAULT: any;
let Polyline: any;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  Polyline = Maps.Polyline;
}

interface CustomMapViewProps extends Partial<MapViewProps> {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  provider?: any;
  onMapReady?: () => void;
  ref?: any;
}

export const CustomMapView: React.FC<CustomMapViewProps> = (props) => {
  if (Platform.OS === 'web') {
    return null; // Or your web alternative
  }

  return <MapView {...props} />;
};

export const CustomMarker = (props: any) => {
  if (Platform.OS === 'web') {
    return null;
  }

  return <Marker {...props} />;
};

export const CustomPolyline = (props: any) => {
  if (Platform.OS === 'web') {
    return null;
  }

  return <Polyline {...props} />;
};

export { PROVIDER_DEFAULT };

const MapScreen = () => {
  const [locationData, setLocationData] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeCoordinates2, setRouteCoordinates2] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingData, setLoadingData] = useState({});
  const { user } = useUserStore();
  const [customerDetails, setCustomerDetails] = useState(null);
  const { userLongitude, userLatitude, userAddress, setUserLocation } = useLocationStore();
  const [selectedRide, setSelectedRide] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync(location.coords);
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `${address[0]?.name}, ${address[0]?.region}`,
      });
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "driverNotifications", user.uid.toString()),
      (doc) => {
        if (doc.exists()) {
          const selectedRide = doc.data();
          const locations = {
            driverLatitude: parseFloat(userLatitude),
            driverLongitude: parseFloat(userLongitude),
            customerLatitude: parseFloat(selectedRide.startLatitude),
            customerLongitude: parseFloat(selectedRide.startLongitude),
            destinationLatitude: parseFloat(selectedRide.destinationLatitude),
            destinationLongitude: parseFloat(selectedRide.destinationLongitude),
            customerPhoneNumber: selectedRide.phone,
          };
          setLocationData(locations);
          setSelectedRide(selectedRide);
        }
      },
      (error) => {
        console.error("Error fetching driver notifications:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (locationData) {
      fetchUser();
      fetchRoute();
    }
  }, [locationData]);

  const fetchUser = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", selectedRide?.rideId));
      if (userDoc.exists()) {
        setCustomerDetails(userDoc.data());
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const [liveLocation, setLiveLocation] = useState({
    latitude: userLatitude,
    longitude: userLongitude
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "driverLocations", user.uid),
      (doc) => {
        if (doc.exists()) {
          const locationData = doc.data();
          setLiveLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude
          });
          fetchRoute();
        }
      },
      (error) => {
        console.error("Error fetching driver location:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchRoute = async () => {
    if (!locationData) return;

    const {
      driverLatitude,
      driverLongitude,
      customerLatitude,
      customerLongitude,
      destinationLatitude,
      destinationLongitude,
    } = locationData;

    try {
      setLoadingRoute(true);

      const driverToCustomerResponse = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${liveLocation.longitude},${liveLocation.latitude}&end=${customerLongitude},${customerLatitude}&geometries=geojson`
      );
      const driverToCustomerData = await driverToCustomerResponse.json();

      if (driverToCustomerData.error) {
        console.error("Driver to Customer API Error:", driverToCustomerData.error);
        return;
      }

      const customerToDestinationResponse = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${customerLongitude},${customerLatitude}&end=${destinationLongitude},${destinationLatitude}&geometries=geojson`
      );
      const customerToDestinationData = await customerToDestinationResponse.json();

      if (customerToDestinationData.error) {
        console.error("Customer to Destination API Error:", customerToDestinationData.error);
        return;
      }

      const driverToCustomer = driverToCustomerData.features[0]?.geometry.coordinates.map(
        ([longitude, latitude]) => ({ latitude, longitude })
      );
      const Customer = customerToDestinationData.features[0]?.geometry.coordinates.map(
        ([longitude, latitude]) => ({ latitude, longitude })
      );

      setRouteCoordinates2(Customer);
      setRouteCoordinates(driverToCustomer);
    } catch (error) {
      console.error("Error fetching route:", error);
    } finally {
      setLoadingRoute(false);
      setLoadingData(false);
    }
  };

  if (loadingData || loadingRoute) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!locationData) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <Text>No location data available</Text>
      </View>
    );
  }

  const callCustomer = () => {
    Alert.alert(
      "Contact Customer",
      "How would you like to contact the customer?",
      [
        {
          text: "Phone Call",
          onPress: () => {
            const phoneNumber = `tel:${customerDetails.phone}`;
            Linking.openURL(phoneNumber);
          }
        },
        {
          text: "WhatsApp",
          onPress: () => {
            if (!customerDetails?.phone) {
              Alert.alert("Error", "Customer phone number not available");
              return;
            }

            const formattedPhone = customerDetails.phone.replace(/^0/, '254');
            const whatsappUrl = `whatsapp://send?phone=${formattedPhone}`;

            Linking.canOpenURL(whatsappUrl)
              .then(supported => {
                if (supported) {
                  return Linking.openURL(whatsappUrl);
                } else {
                  Alert.alert(
                    "WhatsApp Not Installed", 
                    "Please install WhatsApp to contact the customer",
                    [
                      { 
                        text: "Call Instead", 
                        onPress: () => Linking.openURL(`tel:${formattedPhone}`) 
                      },
                      { text: "Cancel", style: "cancel" }
                    ]
                  );
                }
              })
              .catch(err => {
                console.error('Error opening WhatsApp:', err);
                Alert.alert("Error", "Could not open WhatsApp");
              });
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const startRide = async () => {
    try {
      const rideData = {
        status: "rideStarted",
      };
  
      // Update driver notifications
      await updateDoc(doc(db, "driverNotifications", user.uid.toString()), rideData);

      await updateDoc(doc(db, "driverRides", `${user.uid}_${selectedRide?.rideId}`), rideData);
  
     
  
      Alert.alert("Success", "Ride has been started");
    } catch (error) {
      console.error("Error starting ride:", error);
      Alert.alert("Error", "Failed to start ride");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomMapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={() =>
          mapRef.current?.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          })
        }
        showsUserLocation={true}
      >
        <CustomMarker
          coordinate={{
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
          }}
          title="Driver"
          image={icons.selectedMarker}
        />
        <CustomMarker
          coordinate={{
            latitude: locationData.customerLatitude,
            longitude: locationData.customerLongitude,
          }}
          title="Customer"
        />
        <CustomMarker
          coordinate={{
            latitude: locationData.destinationLatitude,
            longitude: locationData.destinationLongitude,
          }}
          title="Destination"
        />
        {routeCoordinates.length > 0 && (
          <CustomPolyline
            coordinates={routeCoordinates}
            strokeColor="blue"
            strokeWidth={4}
          />
        )}
        {routeCoordinates2.length > 0 && (
          <CustomPolyline
            coordinates={routeCoordinates2}
            strokeColor="red"
            strokeWidth={4}
          />
        )}
      </CustomMapView>

      {/* Bottom Section */}
      <View style={styles.bottomSection} className="flex-row justify-between">
        <TouchableOpacity style={styles.callButton} className="flex-row justify-between" onPress={callCustomer}>
          <MaterialIcons name="phone" size={20} color="#34D399" />
          <Text style={styles.callButtonText}>Call Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} className="flex-row justify-between bg-red-400" onPress={startRide}>
          <MaterialIcons name="directions-car" size={20} color="#34D399" />
          <Text style={styles.callButtonText}>START RIDE</Text>
        </TouchableOpacity>
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
  },
  callButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MapScreen;