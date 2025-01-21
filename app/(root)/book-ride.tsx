import { useUser } from "@clerk/clerk-expo";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Image, Text, View, BackHandler, StyleSheet, ActivityIndicator } from "react-native";

import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { useDriverStore, useLocationStore, useUserStore} from "@/store";
import MpesaPayment from "@/components/Payment";
import CustomButton from "@/components/CustomButton";
import { useState, useEffect } from "react";
import { getFirestore, doc, updateDoc, setDoc } from "firebase/firestore";
import { Alert } from "react-native";
import React from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BookRide = () => {
  const {
    userLongitude,
    userLatitude,
    userAddress,
    destinationLatitude,
    destinationLongitude,
    pickUpLatitude,
    pickUpLongitude,
    pickUpAddress,
    destinationAddress
  } = useLocationStore();


  const startLatitude = pickUpLatitude?pickUpLatitude: userLatitude;
  const startLongitude = pickUpLongitude? pickUpLongitude: userLongitude;
  const startAddress = pickUpAddress? pickUpAddress: userAddress;
  const { user } = useUserStore();
  const { selectedDriver,drivers } = useDriverStore();
     

  const driverDetails = drivers?.filter(
    (driver) => driver.uid === selectedDriver,
  )[0];
  console.log(driverDetails);
  const [paymentModal, setPaymentModal] = useState(false);

console.log(user);


 

  const [loadingb, setLoadingb] = useState(false);

  const confirmRide = async () => {
    const fareAmount =await AsyncStorage.getItem("selectedRideAmountPerKm")
    try {
      setLoadingb(true);
      
      const emailData = {
        userData: user,
        driverDetails,
        locations: {
          startAddress,
          destinationAddress
        },
        times,
        amount:Number(fareAmount)
      };
      router.push("/trackRide");
  
      setLoadingb(false);
      const response = await fetch('https://fikishwa-backnd.onrender.com/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });
  
      if (!response.ok) {
        throw new Error('Failed to send confirmation email');
      }
  
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to confirm ride. Please try again.');
    } finally {
      setLoadingb(false);
    }
  };


  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',  
      () => {
        if (paymentModal) {
          setPaymentModal(false);
          return true; // Prevent default back button behavior
        }
        return false; // Allow default back button behavior
      }
    );

    // Cleanup the event listener when component unmounts  
    return () => backHandler.remove();
  }, [paymentModal]);
  const orsAPIKey = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";

  const [chargingAmount, setChargingAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
const [times,setTimes]=useState()
  // Fetch route and calculate fare
  const fetchRoute = async () => {
    if (!userLongitude || !userLatitude || !destinationLongitude || !destinationLatitude) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${startLongitude},${startLatitude}&end=${destinationLongitude},${destinationLatitude}&geometries=geojson`
      );

      const data = await response.json();

      const distanceInMeters = data.features[0].properties.segments[0].distance;
      const distanceInKilometers = distanceInMeters / 1000; // Convert to kilometers
      const fare = (distanceInKilometers *65).toFixed(2); // Calculate fare at 40 KSh per km

      setChargingAmount(Number(fare));
      
    } catch (error) {
      console.error("Error fetching route:", error);
    } finally {
      setLoading(false);
    }
  };




  const fetchTimes = async () => {
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${startLongitude},${startLatitude}&end=${driverDetails.longitude},${driverDetails.latitude}&geometries=geojson`
      );
  
      const data = await response.json();
  
      // Extract travel time in seconds
      const timeInSeconds = data.features[0].properties.segments[0].duration;
  
      // Convert to hours, minutes, and seconds
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      const seconds = Math.floor(timeInSeconds % 60);
  
      // Format the time
      const formattedTime = `${hours > 0 ? `${hours}h ` : ""}${minutes}min`;
      console.log(`Estimated Travel Time: ${formattedTime}`);
  
     setTimes(formattedTime); // Return the formatted time for use elsewhere
    } catch (error) {
      console.error("Error fetching travel time:", error);
      return null; // Return null if there's an error
    }
  };
  
  const [loadingValues, setLoadingValues] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingValues(false);
    }, 4000); // 400ms delay
  
    return () => clearTimeout(timeout);
  }, []);

  // Trigger fetchRoute on component mount
  useEffect(() => {
    fetchTimes()
    fetchRoute();
  }, [userLongitude, userLatitude, destinationLongitude, destinationLatitude]);

  return (
    <RideLayout title="Book Ride" snapPoints={["70%","85%"]}>
      <>
        <Text className="text-xl font-JakartaSemiBold mb-3">
          Ride Information
        </Text>

        <View className="flex flex-row w-full   mt-10">
        <Image
  source={{  uri: driverDetails?.profileImageUrl }}
  className="w-20 h-20 rounded-full mr-5"
  style={{ resizeMode: 'fit' }} // Ensures the image fits within the container without being cut off
/>

          <View className="flex flex-col items-start justify-center ">
            <Text className="text-lg font-JakartaSemiBold">
              {driverDetails?.username.toUpperCase()}
            </Text>

           
          <View className="flex flex-row items-center justify-center  ">
            <Text className="text-sm font-JakartaSemiBold">
              {driverDetails?.carModel}
            </Text>

          </View>
           
          <View className="flex flex-row items-center justify-center py-1 px-2 rounded-md bg-sky-600  ">
            <Text className="text-sm font-JakartaSemiBold text-white">
              {driverDetails?.plate.toUpperCase()}
            </Text>

          </View>
          </View>
        </View>

        <View className="flex flex-col w-full items-start justify-center py-3 px-5 rounded-3xl bg-slate-200 mt-5">
          

 


          

            <View className="flex flex-row items-center justify-between w-full border-b border-white py-3">
              <Text className="text-lg font-JakartaRegular">Pickup Time</Text>
              {loadingValues ? (
        
        <View className="justify-center items-center ">
        <ActivityIndicator size="small" color="#000" />
      </View>
              ) : (
                <Text className="text-lg font-JakartaRegular">{times}</Text>
              )}
            </View>


          <View className="flex flex-row items-center justify-between w-full py-3">
            <Text className="text-lg font-JakartaRegular">Car Seats</Text>
            <Text className="text-lg font-JakartaRegular">
              {driverDetails?.carSeats} seats
            </Text>
          </View>
      
          <View className="flex flex-row items-center justify-between w-full py-3">
            <Text className="text-lg font-JakartaRegular">Color</Text>
            <Text className="text-lg font-JakartaRegular">
              {driverDetails?.vehicleColor} 
            </Text>
          </View>

        </View>

        <View className="flex flex-col w-full items-start justify-center mt-5">
          <View className="flex flex-row items-center justify-start mt-3 border-t border-b border-general-700 w-full py-3">
            <Image source={icons.to} className="w-6 h-6" />
            <Text className="text-lg font-JakartaRegular ml-2">
              {startAddress}
            </Text>
          </View>

          <View className="flex flex-row items-center justify-start border-b border-general-700 w-full py-3">
            <Image source={icons.point} className="w-6 h-6" />
            <Text className="text-lg font-JakartaRegular ml-2">
              {destinationAddress}
            </Text>
          </View>
        </View>

        <CustomButton
      title={loadingb ? "Loading..." : "Confirm Pick Up"}
      onPress={confirmRide}
      disabled={loadingb} // Disable button while loading
      className={`mt-5 bg-black rounded-md ${loadingb ?  "opacity-50" : ""}`} // Add opacity to indicate disabled state
    >
      {loadingb && <ActivityIndicator size="small" color="#fff" />}
    </CustomButton>
         
      </>
    </RideLayout>
  );
};

export default BookRide;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'JakartaRegular',
  },
  value: {
    fontSize: 16,
    fontFamily: 'JakartaRegular',
    color: '#0CC25F',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  skeletonText: {
    height: 20,
    width: 100,
    backgroundColor: '#d4d4d4',
    borderRadius: 4,
  },
  skeletonWide: {
    width: 150,
  },
});