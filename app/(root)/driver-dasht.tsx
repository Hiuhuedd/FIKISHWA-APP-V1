import { useEffect, useState } from "react";
import { ScrollView, Text, View, Switch, Button, Alert, Modal, Pressable,  RefreshControl, Image, Linking} from "react-native";
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

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [rides, setRides] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [selectedRide, setSelectedRide] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [refreshing, setRefreshing] = useState(false);




  const { user } = useUserStore(); // Fetch user data
  const { driver, setDriver } = DriverDetailsStore(); // Fetch and set driver details
  const { userLongitude, userLatitude, userAddress, setUserLocation } = useLocationStore();
  const [ liveloc, setliveloc ] = useState();

  // const toggleOnlineStatus = () => setIsOnline((prev) => !prev);
  const [isVerified, setIsVerified] = useState(false);
  const [documents, setDocuments] = useState({
    license: true,
    insurance: false,
    registration: false,
    backgroundCheck: false
  });

  // Document upload website URL
  const DOCUMENT_UPLOAD_URL = "https://fikishwaconnections.com";


  // Check document verification status
  const checkVerificationStatus = async () => {
    try {
      const docRef = doc(db, "driverVerification", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Get driver category from driver details
        const driverRef = doc(db, "driverDetails", user.uid);
        const driverSnap = await getDoc(driverRef);
        const rideCategory = driverSnap.data()?.rideCategory;

        if (rideCategory === "Motorbike") {
          // Required documents for motorbike
          const requiredDocs = {
            VehicleImage: Boolean(data.documents?.bikeImage),
            VehicleReg: Boolean(data.documents?.bikeReg),
            driversLicense: Boolean(data.documents?.driversLicense),
            goodConduct: Boolean(data.documents?.goodConduct),
            nationalIdBack: Boolean(data.documents?.nationalIdBack),
            nationalIdFront: Boolean(data.documents?.nationalIdFront),
            profilePhoto: Boolean(data.documents?.profilePhoto),
            taxCompliance: Boolean(data.documents?.taxCompliance)
          };

          setDocuments(requiredDocs);
          setIsVerified(Object.values(requiredDocs).every(status => status === true));
          console.log(data.documents);

        } else {
          console.log(data.documents);
          
          // Required documents for other categories (cars, etc.)
          const requiredDocs = {
            VehicleImage: Boolean(data.documents?.carImage),
            VehicleReg: Boolean(data.documents?.carReg),
            driversLicense: Boolean(data.documents?.driversLicense),
            goodConduct: Boolean(data.documents?.goodConduct),
            nationalIdBack: Boolean(data.documents?.nationalIdBack),
            nationalIdFront: Boolean(data.documents?.nationalIdFront),
            profilePhoto: Boolean(data.documents?.profilePhoto),
            psvBadge: Boolean(data.documents?.psvBadge),
            taxCompliance: Boolean(data.documents?.taxCompliance)
          };
          console.log(requiredDocs);
          setDocuments(requiredDocs);
          setIsVerified(Object.values(requiredDocs).every(status => status === true));
        }

        // Check bank info
        const bankInfoComplete = Boolean(data.accountNumber && data.bankName);
        if (!bankInfoComplete) {
          setIsVerified(false);
        }

      }
    } catch (error) {
      console.error("Error checking verification:", error);
    }
  };

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  // Modified toggle online status to check verification
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
      const ridesDoc = await getDoc(doc(db, "driverRides", user.uid));
      if (ridesDoc.exists()) {
        const { rides, totalEarnings } = ridesDoc.data();
        setRides(rides || []);
        setEarnings(totalEarnings || 0);
      }
    } catch (error) {
      console.error("Error fetching rides and earnings:", error);
      Alert.alert("Error", "An error occurred while fetching rides and earnings.");
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
    fetchDriver()
    const unsubscribe = onSnapshot(
      doc(db, "driverNotifications", user.uid.toString()),
      (doc) => {
        if (doc.exists()  && doc.data().status==="confirmed") {
          const data = doc.data();
          setSelectedRide(data);
        

          fetchUser(data.rideId);
          setModalVisible(true);
          console.log(data);
        }
        
      },
      (error) => {
        console.error("Error fetching driver notifications:", error);
      }
    );
    return () => unsubscribe();
  }, [refreshing]);


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


  const isFullyCompliant = () => {
    return Object.values(documents).every(status => status === true);
  };

  // ... (keep existing fetch functions)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docRef = doc(db, "driverDocuments", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDocuments(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDriver();
    fetchDocuments();
    // ... (keep existing notification subscription)
  }, [refreshing]);



  useEffect(() => {
    let locationSubscription;
    let isMounted = true;
  
    const trackLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
  
        // Start watching position
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Minimum distance (in meters) between updates
            timeInterval: 50000,   // Minimum time (in ms) between updates
          },
          async (location) => {
            if (!isMounted) return;
  
            const address = await Location.reverseGeocodeAsync(location.coords);
  
            // Update Firestore with new location
            await setDoc(
              doc(db, "driverLocations", user.uid.toString()),
              {
                uid: user.uid,
                username: user.userName,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address: `${address[0]?.name}, ${address[0]?.region}`,
                isOnline,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
  console.log("location sent to db");
  
          }
        );
      } catch (error) {
        console.error("Error tracking location:", error);
      }
    };
  
    trackLocation();
  
    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [user?.uid, user?.userName, isOnline]);

  const onRefresh = async () => {
    setRefreshing(!refreshing);
   
  };
  const logOut=()=>{
    setDriver(null);
    router.replace("/(auth)/sign-in")
  }
  const getComplianceStatus = () => {
    const totalDocs = Object.keys(documents).length;
    const uploadedDocs = Object.values(documents).filter(status => status).length;
    return Math.round((uploadedDocs / totalDocs) * 100);
  };
  return (
    <ScrollView 
      className="flex-1 bg-slate-50" 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Status Bar */}
      <View className="bg-sky-600 p-4 rounded-b-3xl shadow-lg">
        <View className="mt-12 mb-4">
          <Text className="text-3xl font-bold text-white">
            Hello, {user?.userName || "Driver"} 👋
          </Text>
          <Text className="text-white text-lg opacity-90">
            {isOnline ? "You're Online" : "You're Offline"}
          </Text>
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

      {/* Driver Stats Cards */}
      <View className="flex-row flex-wrap justify-between mx-4 mt-4">
        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="text-gray-500">Total Earnings</Text>
          <Text className="text-2xl font-bold text-green-600">
            ${earnings.toFixed(2)}
          </Text>
        </View>
        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="text-gray-500">Total Rides</Text>
          <Text className="text-2xl font-bold text-sky-600">
            {rides.length}
          </Text>
        </View>
      </View>

      {/* Driver Profile Card */}
      <View className="mx-4 bg-white rounded-xl shadow-sm p-4 mb-4">
        <View className="flex-row items-center">
          <Image
            source={{ uri: driver?.profileImageUrl }}
            className="w-16 h-16 rounded-full bg-gray-200"
          />
          <View className="ml-4">
            <Text className="text-lg font-semibold">{driver?.carModel || "Vehicle N/A"}</Text>
            <Text className="text-gray-600">{driver?.plate || "Plate N/A"}</Text>
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

      {/* Recent Rides */}
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
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="font-medium text-gray-800">
                    {ride.startLocation}
                  </Text>
                  <Text className="text-gray-500">
                    To: {ride.destination}
                  </Text>
                </View>
                <Text className={`
                  ${ride.status === 'completed' ? 'text-green-600' : 'text-blue-600'}
                  font-medium
                `}>
                  {ride.status}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text className="text-gray-500 text-center py-4">
            No rides available
          </Text>
        )}
      </View>

      {/* Logout Button */}
      <View className="mx-4 mb-8">
        <Pressable 
          onPress={logOut}
          className="bg-red-500 p-4 rounded-xl"
        >
          <Text className="text-white text-center font-semibold">
            Log Out
          </Text>
        </Pressable>
      </View>

      {/* Ride Details Modal */}
      {selectedRide && customerDetails && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 bg-white">
            <View className="p-4 bg-sky-600">
              <Text className="text-xl font-bold text-white">
                Ride Details
              </Text>
            </View>
            <MapDriver 
              selectedRide={selectedRide} 
              customerDetails={customerDetails} 
              setModalVisible={setModalVisible} 
            />
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default DriverDashboard;
