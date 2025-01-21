import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { icons } from "@/constants";
import { DriverCardProps } from "@/types/type";
import { useLocationStore } from "@/store";

const DriverCard = ({ item, selected, setSelected }: DriverCardProps) => {
  const orsAPIKey = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";
  const [routeTimes, setRouteTimes]=useState(null);

console.log(item);



  



  const {
    userAddress,
    destinationAddress,
    userLongitude,
    userLatitude,
    destinationLongitude,
    destinationLatitude,
  } = useLocationStore();
  const fetchTimes = async () => {
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${userLongitude},${userLatitude}&end=${destinationLongitude},${destinationLatitude}&geometries=geojson`
      );
  
      const data = await response.json();
  
      // Extract travel time in seconds
      const timeInSeconds = data.features[0].properties.segments[0].duration;
  
      // Convert to hours, minutes, and seconds
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      const seconds = Math.floor(timeInSeconds % 60);
  
      // Format the time
      const formattedTime = `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`;
      console.log(`Estimated Travel Time: ${formattedTime}`);
  
      return (formattedTime); // Return the formatted time for use elsewhere
    } catch (error) {
      console.error("Error fetching travel time:", error);
      return null; // Return null if there's an error
    }
  };
  
  return (
    <TouchableOpacity
      onPress={()=>setSelected()}
      className={`${
        selected === item.uid ? "bg-general-600" : "bg-white"
      } flex flex-row items-center justify-between py-5 px-3 rounded-xl`}
    >
      {/* Driver's car image */}
      <Image
        source={
          item.carImageUrl
            ? { uri: item.carImageUrl }
            : { uri: "https://ucarecdn.com/a3872f80-c094-409c-82f8-c9ff38429327/-/preview/930x932/"} // Fallback image
        }
        className="w-14 h-14 rounded-full"
        style={{ resizeMode: 'contain' }} 
      />

      {/* Driver details */}
      <View className="flex-1 flex flex-col items-start justify-center mx-3">
        {/* Car model and rating */}
        <View className="flex flex-row items-center justify-start mb-1">
          <Text className="text-lg font-JakartaRegular">{item.carModel}</Text>

          <View className="flex flex-row items-center space-x-1 ml-2">
            <Image source={icons.star} className="w-3.5 h-3.5" />
            <Text className="text-sm font-JakartaRegular">4.0</Text>
          </View>
        </View>

        {/* Driver status and additional details */}
        <View className="flex flex-row items-center justify-start">
          <Text className="text-sm font-JakartaRegular text-general-800">
            {item.isOnline ? "Online" : "Offline"}
          </Text>

          <Text className="text-sm font-JakartaRegular text-general-800 mx-1">
            | 
          </Text>

          <Text className="text-sm font-JakartaRegular text-general-800">
            {item.plate.toUpperCase()}
          </Text>

          <Text className="text-sm font-JakartaRegular text-general-800 mx-1">
            |
          </Text>

          
        </View>
      </View>

      {/* Arrival time */}
      {/* <View>
        <Text className="text-sm font-JakartaRegular text-general-800">
      TRAVEL TIME { fetchTimes()}
        </Text>
      </View> */}
    </TouchableOpacity>
  );
};

export default DriverCard;
