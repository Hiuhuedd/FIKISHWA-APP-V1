import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View, ActivityIndicator, Image } from "react-native";

import CustomButton from "@/components/CustomButton";
import RideLayout from "@/components/RideLayout";
import { useLocationStore } from "@/store";
import { icons } from "@/constants";

const FindRide = () => {
  const {
    userAddress,
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
    destinationAddress,
    pickUpLatitude,
    pickUpLongitude,
    pickUpAddress,
  } = useLocationStore();

  const orsAPIKey = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";

  const [chargingAmount, setChargingAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const startLatitude = pickUpLatitude?pickUpLatitude: userLatitude;
  const startLongitude = pickUpLongitude? pickUpLongitude: userLongitude;
  const startAddress = pickUpAddress? pickUpAddress: userAddress;
  // Fetch route and calculate fare
  const fetchRoute = async () => {
    // Use pickup coordinates if they exist, otherwise fallback to user coordinates
  
    if (!startLongitude || !startLatitude || !destinationLongitude || !destinationLatitude) return;
  
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${startLongitude},${startLatitude}&end=${destinationLongitude},${destinationLatitude}&geometries=geojson`
      );
  
      const data = await response.json();
  
      const distanceInMeters = data.features[0].properties.segments[0].distance;
      const distanceInKilometers = distanceInMeters / 1000; // Convert to kilometers
      const fare = (distanceInKilometers * 40).toFixed(2); // Calculate fare at 40 KSh per km
  
      setChargingAmount(Number(fare));
    } catch (error) {
      console.error("Error fetching route:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Trigger fetchRoute on component mount
  useEffect(() => {
    fetchRoute();
  }, [pickUpLatitude, pickUpLongitude, userLongitude, userLatitude, destinationLongitude, destinationLatitude]);
  
  // Trigger fetchRoute on component mount
  useEffect(() => {
    fetchRoute();
  }, [userLongitude, userLatitude, destinationLongitude, destinationLatitude]);

  return (
    <RideLayout title="Find Ride" snapPoints={["35%", "40%"]}>
      <View className="">
        <Text className="text-xl font-JakartaSemiBold mb-3 text-center">Confirm Ride</Text>

        <View className="flex flex-col w-full items-start justify-center mt-5">
          <View className="flex flex-row items-center justify-start mt-3 border-t border-b border-general-700 w-full py-3">
            <Image source={icons.to} className="w-6 h-6" />
            <Text className="text-lg font-JakartaBold ml-2">
              {destinationAddress}
            </Text>
          </View>

          <View className="flex flex-row items-center justify-start border-b border-general-700 w-full py-3">
            <Image source={icons.point} className="w-6 h-6" />
            <Text className="text-lg font-JakartaBold ml-2">
              {startAddress}
            </Text>
          </View>
        </View>
{/* 
        {loading ? (
          <ActivityIndicator size="large" color="#000" />
        ) : chargingAmount !== null ? (
          <View className="my-5">
          <Text className="text-lg font-JakartaSemiBold">
  Estimated Fare: {Math.round(chargingAmount / 10) * 10} KSh
</Text>
          </View>
        ) : null} */}


        <CustomButton
          title="Select ride"
          onPress={() => router.push(`/(root)/confirm-ride`)}
          className="mt-5 bg-black rounded-md"
        />
      </View>
    </RideLayout>
  );
};

export default FindRide;
