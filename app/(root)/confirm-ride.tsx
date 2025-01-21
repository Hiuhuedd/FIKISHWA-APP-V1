import { router } from "expo-router";
import { Alert, FlatList, Text, View, ActivityIndicator, Image, TouchableOpacity, Modal } from "react-native";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../(auth)/firebase";
import CustomButton from "@/components/CustomButton";
import RideLayout from "@/components/RideLayout";
import { useDriverStore, useLocationStore, useUserStore } from "@/store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CATEGORY_IMAGES = {
  Economy: "https://images01.nicepagecdn.com/c461c07a441a5d220e8feb1a/211cb42d65945a3299e2d376/001.jpg",
  XL: "https://images01.nicepagecdn.com/c461c07a441a5d220e8feb1a/5b00fa0eb9b25f3a9212c8fa/ghhghg.jpg",
  MotorBike: "https://images.vexels.com/media/users/3/152653/isolated/preview/3dfc4ac50eca195cc2b1a4fd8ac56e05-sport-motorcycle-icon.png",
  Premium: "https://images01.nicepagecdn.com/c461c07a441a5d220e8feb1a/86cdb578d5ba5e62b77a7b7b/13.jpg",
};

const CATEGORY_RATES = {
  Economy: 65,
  XL: 85,
  MotorBike: 45,
  Premium: 140,
};

const ORS_API_KEY = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";

const ConfirmRide = () => {
  // State Management
  const [chargingAmounts, setChargingAmounts] = useState({});
  const [rideCategories, setRideCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCat, setselectedCat] = useState(false);

  // Store Management
  const { setDrivers, drivers, setSelectedDriver } = useDriverStore();
  const { user } = useUserStore();
  const {
    userLongitude, userLatitude, userAddress,
    destinationLatitude, destinationLongitude,
    pickUpLatitude, pickUpLongitude,
    pickUpAddress, destinationAddress
  } = useLocationStore();

  const startLatitude = pickUpLatitude || userLatitude;
  const startLongitude = pickUpLongitude || userLongitude;
  const startAddress = pickUpAddress || userAddress;

  // API Functions
  const calculateFareForCategory = async (category, drivers) => {
    if (!drivers || drivers.length === 0) return "N/A";

    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startLongitude},${startLatitude}&end=${destinationLongitude},${destinationLatitude}`
      );
      const data = await response.json();
      const distanceInKm = data.features[0].properties.segments[0].distance / 1000;
      const rate = CATEGORY_RATES[category] || 65;
      const calculatedFare = distanceInKm * rate;
      
      // Apply minimum fare of 250 and round to nearest 10
      const finalFare = Math.max(calculatedFare, 250);
      const roundedFare = Math.round(finalFare / 10) * 10;
      
      return roundedFare.toFixed(2);
    } catch (error) {
      console.error("Error calculating fare:", error);
      return "N/A";
    }
  };

  const calculateAllFares = async () => {
    const newChargingAmounts = {};
    for (const [category, drivers] of Object.entries(rideCategories)) {
      newChargingAmounts[category] = await calculateFareForCategory(category, drivers);
    }
    setChargingAmounts(newChargingAmounts);
  };

  // Firebase Functions
  const fetchDrivers = async () => {
    try {
      const driverSnapshot = await getDocs(collection(db, "driverLocations"));
      const driverPromises = driverSnapshot.docs.map(async (locationDoc) => {
        const locationData = locationDoc.data();
        const driverDetailsDoc = await getDoc(doc(db, "driverDetails", locationData.uid));
        return {
          ...locationData,
          ...(driverDetailsDoc.exists() ? driverDetailsDoc.data() : {}),
        };
      });
      
      const driverList = await Promise.all(driverPromises);
      setDrivers(driverList);

      const categories = driverList.reduce((acc, driver) => {
        const { rideCategory } = driver;
        if (!acc[rideCategory]) acc[rideCategory] = [];
        acc[rideCategory].push(driver);
        return acc;
      }, {});
      
      setRideCategories(categories);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const monitorNotificationStatus = () => {
    return onSnapshot(
      collection(db, "driverNotifications"),
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          if (change.type === "modified" && data.status === "accepted") {
            setSelectedDriver(data.uid);
            setModalVisible(false);
            router.push("/(root)/book-ride");
          }
        });
      },
      (error) => console.error("Error monitoring notifications:", error)
    );
  };

  // Event Handlers
  const handleCategorySelection = async (category) => {
    setSelectedCategory(category);
    await AsyncStorage.setItem('selectedRideAmountPerKm', chargingAmounts[category]);

    try {
      const driversInCategory = rideCategories[category];
      if (!driversInCategory?.length) {
        return Alert.alert("No Drivers Found", `No drivers available in ${category}.`);
      }

      for (const driver of driversInCategory) {
        await setDoc(doc(db, "driverNotifications", driver.uid), {
          status: "confirmed",
          confirmedAt: new Date().toISOString(),
          rideId: user.uid,
          startAddress,
          destinationAddress,
          startLongitude,
          startLatitude,
          destinationLongitude,
          destinationLatitude,
        });
      }

      setselectedCat(category);
      setModalVisible(true);
      monitorNotificationStatus();
    } catch (error) {
      console.error("Error sending notifications:", error);
      Alert.alert("Error", "Failed to notify drivers. Please try again.");
    }
  };

  // Effects
  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (Object.keys(rideCategories).length) calculateAllFares();
  }, [rideCategories]);

  // Render Functions
  const renderRideCategory = ({ item }) => {
    const categoryImage = CATEGORY_IMAGES[item] || "https://cdn-icons-png.flaticon.com/512/2975/2975510.png";
    const driverCount = rideCategories[item]?.length || 0;

    return (
      <TouchableOpacity
        onPress={() => handleCategorySelection(item)}
        className="border border-1 flex-row items-center justify-between rounded-lg my-1 p-2"
        style={{ borderColor: selectedCategory === item ? "#4CAF50" : "#e0e0e0" }}
      >
        <Image
          source={{ uri: categoryImage }}
          style={{ width: 70, height: 70, borderRadius: 10, resizeMode: 'contain' }}
        />
        <View>
          <Text className="text-lg font-bold">{item}</Text>
          <Text className="text-sm text-gray-600">{driverCount} Drivers Available</Text>
        </View>
        <View>
          <Text className="text-slate-500 text-lg">
            {isNaN(chargingAmounts[item]) 
              ? <ActivityIndicator size="small" color="#0CC25F" />
              : `Ksh ${(Math.round(chargingAmounts[item] / 10) * 10).toLocaleString()}`
            }
          </Text>
          {!isNaN(chargingAmounts[item]) && (
            <Text className="text-slate-500 text-sm line-through">
              {`Ksh ${((Math.round(chargingAmounts[item] / 10) * 10) + 120).toLocaleString()}`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <RideLayout title="Choose a Rider" snapPoints={["55%", "65%"]}>
      <Text className="text-xl font-JakartaSemiBold mb-3">Select a Ride</Text>
      
      <FlatList
    data={Object.keys(rideCategories).filter(key => 
      rideCategories[key]?.length > 0 && 
      CATEGORY_RATES[key] !== undefined && 
      CATEGORY_IMAGES[key] !== undefined
    )}
    keyExtractor={(item) => item}
    renderItem={renderRideCategory}
      />

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-[400px] bg-white rounded-lg p-5 items-center shadow-lg">
            <ActivityIndicator size="large" color="#000" />
            <Text className="mt-5 text-base font-medium">
              Waiting for riders in <Text className="font-bold">{selectedCat}</Text>...
            </Text>
          </View>
        </View>
      </Modal>
    </RideLayout>
  );
};

export default ConfirmRide;