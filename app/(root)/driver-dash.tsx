import { useEffect, useState } from "react";
import { ScrollView, Text, View, Switch, Button, Alert, Modal, Pressable, RefreshControl, Image, Linking } from "react-native";
import { useUserStore, DriverDetailsStore, useLocationStore } from "@/store";
import * as Location from "expo-location";
import { doc, getDoc, getFirestore, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../(auth)/firebase";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { data } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapDriver from "@/components/DriverMap";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

// Define required documents structure
const requiredDocuments = {
  driversLicense: false,
  goodConduct: false,
  nationalIdBack: false,
  nationalIdFront: false,
  profilePhoto: false,
  psvBadge: false,
  taxCompliance: false,
  vehicleImage: false,
  vehicleReg: false
};

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [rides, setRides] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [selectedRide, setSelectedRide] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [documents, setDocuments] = useState(requiredDocuments);
  const [liveloc, setliveloc] = useState();

  const { user } = useUserStore();
  const { driver, setDriver } = DriverDetailsStore();
  const { userLongitude, userLatitude, userAddress, setUserLocation } = useLocationStore();

  const DOCUMENT_UPLOAD_URL = "https://fikishwaconnections.com";

  // Check document verification status
  const checkVerificationStatus = async () => {
    try {
      if (!user?.email) {
        console.error("No user email found");
        return;
      }

      const docRef = doc(db, "driver-partners", user.email.toLowerCase().trim());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const documentStatus = {};
        Object.keys(requiredDocuments).forEach(docType => {
          documentStatus[docType] = Boolean(data.documents?.[docType]);
        });
        
        setDocuments(documentStatus);
        setIsVerified(Object.values(documentStatus).every(status => status === true));
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    }
  };

  const toggleOnlineStatus = () => {
    if (!isVerified) {
      Alert.alert(
        "Verification Required",
        "Please upload all required documents before going online.",
        [
          {
            text: "Upload Documents",
            onPress: () => Linking.openURL(DOCUMENT_UPLOAD_URL)
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }
    setIsOnline(prev => !prev);
  };

  const fetchDriverVerification = async () => {
    try {
      if (!user?.email) return;
      
      const docRef = doc(db, "driver-partners", user.email.toLowerCase().trim());
      const driverDoc = await getDoc(docRef);
      
      if (driverDoc.exists()) {
        const userData = driverDoc.data();
       console.log(userData);
       
      }
    } catch (error) {
      console.error("Error fetching driver details:", error);
      Alert.alert("Error", "Failed to fetch driver details.");
    }
  };

  const fetchDriver = async () => {
    try {   
      const driverDoc = await getDoc(doc(db, "driverDetails", user.uid));
      if (driverDoc.exists()) {
        const userData = driverDoc.data();
        setDriver({
          uid: user.uid,
          email: user.email,
          carModel: userData.carModel,
          phone: user.phone,
          plate: userData.plate,
          profileImageUrl: userData.profileImageUrl,
          category:userData.rideCategory
        });
        console.log((userData));
      }
      
    } catch (error) {
      console.error("Error fetching driver details:", error);
      Alert.alert("Error", "An error occurred while fetching driver details.");
    }
  };
  const fetchDriverRidesAndEarnings = async () => {
    try {
      // Reference the driver's rides document
      const ridesDocRef = doc(db, "driverRides", user.uid);
  
      // Fetch the document
      const ridesDoc = await getDoc(ridesDocRef);
  
      if (ridesDoc.exists()) {
        // Extract the rides array
        const rides = ridesDoc.data().rides || [];
  
        // Filter rides with "completed" status and calculate total earnings
        const totalEarnings = rides
          .filter((ride) => ride.status === "completed")
          .reduce((total, ride) => total + (ride.fare || 0), 0);
  
        // Update the state with the fetched rides array and earnings
        setRides(rides);
        setEarnings(totalEarnings); // Assuming you have a state variable for earnings
      } else {
        console.log("No rides document found for the user.");
        setRides([]); // Set an empty array if no document exists
        setEarnings(0); // Set earnings to 0 if no document exists
      }
    } catch (error) {
      console.error("Error fetching rides and earnings:", error);
      Alert.alert("Error", "Failed to fetch rides and earnings.");
    }
  };
  
  const fetchUser = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setCustomerDetails(userDoc.data());
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  useEffect(() => {
    checkVerificationStatus();
    fetchDriver();
    fetchDriverRidesAndEarnings();

    const unsubscribe = onSnapshot(
      doc(db, "driverNotifications", user.uid),
      (doc) => {
        if (doc.exists() && doc.data().status === "confirmed") {
          const data = doc.data();
          setSelectedRide(data);
          fetchUser(data.rideId);
          setModalVisible(true);
        }
      },
      (error) => console.error("Error fetching notifications:", error)
    );

    return () => unsubscribe();
  }, [refreshing]);

  // Location tracking
  useEffect(() => {
    let locationSubscription;
    let isMounted = true;

    const trackLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasPermission(false);
          return;
        }
        setHasPermission(true);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 50000,
          },
          async (location) => {
            if (!isMounted) return;

            const address = await Location.reverseGeocodeAsync(location.coords);
            
            await setDoc(doc(db, "driverLocations", user.uid), {
              uid: user.uid,
              username: user.userName,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              address: `${address[0]?.name}, ${address[0]?.region}`,
              isOnline,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
        );
      } catch (error) {
        console.error("Error tracking location:", error);
      }
    };

    if (isOnline) {
      trackLocation();
    }

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isOnline]);

  const onRefresh = () => setRefreshing(prev => !prev);

  const logOut = () => {
    setDriver(null);
    router.replace("/(auth)/sign-in");
  };

  return (
    <ScrollView 
      className="flex-1 bg-slate-50" 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-sky-600 p-4 shadow-lg flex-row w-full items-center justify-between">
        <View className="mt-12 mb-4">
          <Text className="text-3xl font-bold text-white">
            Hello, {user?.userName || "Driver"} 
          </Text>
          <Text className="text-white text-lg opacity-90">
            {isOnline ? "You're Online" : "You're Offline"}
          </Text>
        </View>
        <View className="mx-4 mt-5">
        <Pressable 
          onPress={logOut}
          className="bg--500 p-4 rounded-xl"
        >
          <Text className="text-white text-center font-semibold">
            Log Out
          </Text>
        </Pressable>
      </View>
      </View>

      {/* Document Verification Status */}
      {!isVerified && (
        <View className="mx-4 mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <Text className="text-lg font-semibold text-yellow-800 mb-2">
            Document Verification Required
          </Text>
          <View className="space-y-2">
            {Object.entries(documents).map(([doc, status]) => (
              <View key={doc} className="flex-row justify-between items-center">
                <Text className="text-yellow-700 capitalize">
                  {doc.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <Text className={status ? "text-green-600" : "text-red-500"}>
                  {status ? "✓ Verified" : "⚠ Required"}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => Linking.openURL(DOCUMENT_UPLOAD_URL)}
            className="mt-4 bg-yellow-600 p-3 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Upload Documents
            </Text>
          </Pressable>
        </View>
      )}

      {/* Stats Cards */}  
      <View className="flex-row flex-wrap justify-between mx-4 mt-4">
        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="text-gray-500">Total Earnings</Text>
          <Text className="text-lg font-bold text-green-600">
            KSH {earnings.toFixed(2)}
          </Text>
        </View>
        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="text-gray-500">Total Rides</Text>
          <Text className="text-2xl font-bold text-sky-600">
            {rides.length}
          </Text>
        </View>
      </View>

      {/* Driver Profile */}
      <View className="mx-4 bg-white rounded-xl shadow-sm p-4 mb-4">
        <View className="flex-row items-center">
          <Image
            source={{ uri: driver?.profileImageUrl }}
            className="w-16 h-16 rounded-full bg-gray-200"
          />
          <View className="ml-4">
            <Text className="text-lg font-semibold">{driver?.carModel || "Vehicle N/A"}</Text>
            <Text className="text-gray-600">{driver?.plate.toUpperCase() || "Plate N/A"}</Text>
          </View>
        </View>
        <View className="mt-4 pt-4 border-t border-gray-100">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600">Availability</Text>
            <Switch 
              value={isOnline} 
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
              thumbColor={isOnline ? "#2563eb" : "#f4f4f5"}
            />
          </View>
        </View>
      </View>
<ScrollView>

      <View className="mx-4 bg-white rounded-xl shadow-sm p-4 mb-4">
        <Text className="text-xl font-semibold mb-4">Recent Rides</Text>
        {rides.length > 0 ? (
  rides.map((ride, index) => (
    <Pressable
      key={index}
      onPress={() => {
        setSelectedRide(ride);
        setModalVisible(true);
      }}
      className="p-4 bg-gray-50 rounded-lg mb-2 border border-gray-100"
    >
      <View className="flex-row justify-between items-start">
        {/* Ride Details */}
        <View className="flex-1">
          <Text className="font-medium text-gray-800">
            From: {ride.location?.startAddress || "Unknown"}
          </Text>
          <Text className="text-gray-500">
            To: {ride.location?.destinationAddress || "Unknown"}
          </Text>
          <Text className="text-gray-500 mt-1">
            Distance: {ride.distance ? `${ride.distance.toFixed(1)} km` : "N/A"}
          </Text>
          <Text className="text-gray-500">
            Duration: {ride.duration || "N/A"}
          </Text>
          <Text className="text-gray-500">
            Fare: {ride.fare ? `KES ${ride.fare.toLocaleString()}` : "N/A"}
          </Text>
        </View>

        {/* Status */}
        <Text
          className={`ml-4 ${
            ride.status === "completed"
              ? "text-green-600"
              : ride.status === "accepted"
              ? "text-blue-600"
              : "text-gray-500"
          } font-medium`}
        >
          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
        </Text>
      </View>

      {/* Customer Details */}
      <View className="mt-2">
        <Text className="text-gray-600 text-sm">
          Customer: {ride.customerDetails?.username || "N/A"}
        </Text>
        <Text className="text-gray-600 text-sm">
          Phone: {ride.customerDetails?.phone || "N/A"}
        </Text>
        <Text className="text-gray-600 text-sm">
          Email: {ride.customerDetails?.email || "N/A"}
        </Text>
      </View>

      {/* Timestamp */}
      <Text className="text-gray-400 text-sm mt-2">
        {ride.confirmedAt
          ? `Accepted: ${new Date(ride.confirmedAt).toLocaleString()}`
          : "Not yet confirmed"}
      </Text>
      {ride.completedAt && (
        <Text className="text-gray-400 text-sm">
          Completed: {new Date(ride.completedAt).toLocaleString()}
        </Text>
      )}
    </Pressable>
  ))
) : (
  <Text className="text-gray-500 text-center py-4">
    No rides available
  </Text>
)}

      </View>
</ScrollView>
      {/* Recent Rides */}

      {/* Logout Button */}
  

      {/* Ride Details Modal */}
      {selectedRide && customerDetails && isVerified&& isOnline&&(
        <Modal
          animationType="slide"
          transparent={false} 
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
         
            <MapDriver 
              selectedRide={selectedRide} 
              customerDetails={customerDetails} 
              setModalVisible={setModalVisible} 
            />
          
        </Modal>
      )}
    </ScrollView>
  );
};

export default DriverDashboard;