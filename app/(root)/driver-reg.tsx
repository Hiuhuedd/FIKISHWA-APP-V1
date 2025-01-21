import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker"; // Image picker library
import InputField from "@/components/InputField";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../(auth)/firebase";
import { DriverDetailsStore, useLocationStore, useUserStore } from "@/store";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";

const DriverRegistration = () => {
  const { setUserLocation } = useLocationStore();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState(""); // To store uploaded image URL
  const [image, setImage] = useState(null); // To store selected image URI

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords?.latitude!,
        longitude: location.coords?.longitude!,
      });

      setUserLocation({
        latitude: location.coords?.latitude,
        longitude: location.coords?.longitude,
        address: `${address[0].name}, ${address[0].region}`,
      });
    })();
  }, []);

  const [form, setForm] = useState({
    carModel: "Select Car Model",
    plate: "",
    licenseNumber: "",
    carSeats: "",
    vehicleColor: "",
    carImageUrl: "",
    profileImageUrl: "", // New field for profile image
  });

    // Updated car models with image URLs
    const carModels = [
      { name: "Mazda Demio", imageUrl: "https://blog.japanesecartrade.com/wp-content/uploads/2021/04/mazda-demio-4th-gen.jpg" },
      { name: "Toyota Corolla", imageUrl: "https://media.dealervenom.com/jellies/Toyota/Corolla%20Hatchback/C456983_040_Side.png?auto=compress%2Cformat" },
      { name: "Nissan March", imageUrl: "https://wieck-nissanao-production.s3.amazonaws.com/photos/9c4a42185141661cfc09154df9f0d35993a30402/preview-768x432.jpg" },
      { name: "Honda Fit", imageUrl: "https://cdn.dlron.us/static/dealer-16496/2019_honda_fit_sport.png" },
      { name: "Suzuki Alto", imageUrl: "https://cache4.pakwheels.com/system/car_generation_pictures/6013/original/Suzuki_Alto_-_PNG.png?1635945100" },
      { name: "Daihatsu Mira", imageUrl: "https://dreamzcarz.pk/wp-content/uploads/2024/09/daihatsu-mira.jpg" },
      { name: "Nissan Dayz", imageUrl: "https://i.pinimg.com/originals/85/f6/9c/85f69c3d0484608d1f6d9b8813f776c8.jpg" },
      { name: "Mazda Carol", imageUrl: "https://cdn.motor1.com/images/mgl/KbJA3l/s3/mazda-carol.jpg" },
      { name: "Toyota Pixis", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYz1qodoodoqs7BZ64KRxNETHzijimVoMjsw&s" },
      { name: "Mercedes-Benz", imageUrl: "https://cdn.motor1.com/images/mgl/vZr9g/s1/4x3/mercedes-benz-logo.jpg" },
      { name: "BMW", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f4/BMW_logo_%282017%29.svg" },
      { name: "Toyota Harrier", imageUrl: "https://carfromjapan.com/asset/load/newest/toyota/toyota-harrier.png" },
      { name: "Subaru Forester", imageUrl: "https://www.carscoops.com/wp-content/uploads/2022/10/2024-Subaru-Forester-Sport-Japan-1-768x432.jpg" },
      { name: "Land Cruiser Prado", imageUrl: "https://toyota.com.my/storage/2022/06/08/22m-y-launched-land-cruiser-prado-main.png" }
    ];
    
  

  const { setDriver } = DriverDetailsStore();
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    uploadToImgur(result.assets[0].uri)
    setImage(result.assets[0].uri);
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadToImgur = async (imagePath: string) => {
    console.log(imagePath);
    
    const formData = new FormData();
    formData.append('image', {
      uri: imagePath,
      type: 'image/jpeg', // or the appropriate MIME type
      name: 'driverImage.jpg',
    });
  
    const response = await axios.post('https://api.imgur.com/3/image', formData, {
      headers: {
        Authorization: 'Client-ID your-client-id',
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response) {
      setForm({ ...form, profileImageUrl: response.data.data.link})
      setImageUrl(response.data.data.link) // Use this URL in your app
      setImage(response.data.data.link);
      console.log(response);
      
    }
    else{
      Alert.alert("uplasd failed")
    }
  };

// Define car model categories
const carModelCategories = {
  Economy: ["Mazda Demio", "Toyota Corolla", "Nissan March", "Honda Fit", "Suzuki Alto"],
  XL: ["Toyota Noah", "Mazda Carol"],
  Premium: ["Mercedes-Benz", "BMW", "Toyota Pixis", "Toyota Harrier", "Subaru Forester", "land Cruiser Prado"],
  Motorbike: ["Nissan Dayz"],
};

const getCategory = (carModel: string, carSeats: string): string => {
  if (carModelCategories.Economy.includes(carModel)) return "Economy";
  if (carModelCategories.XL.includes(carModel) && parseInt(carSeats) >= 6) return "XL";
  if (carModelCategories.Premium.includes(carModel)) return "Premium";
  if (carModelCategories.Motorbike.includes(carModel)) return "Motorbike";
  return "Unknown";
};

const onRegisterPress = async () => {
  if (
    !form.carModel ||
    form.carModel === "Select Car Model" ||
    !form.plate ||
    !form.licenseNumber ||
    !form.carSeats ||
    !form.vehicleColor ||
    !image // Ensure profile image is included
  ) {
    Alert.alert("Error", "Please fill in all fields.");
    return;
  }

  const selectedCar = carModels.find((model) => model.name === form.carModel);
  if (selectedCar) {
    form.carImageUrl = selectedCar.imageUrl;
  } else {
    Alert.alert("Error", "Invalid car model selected.");
    return;
  }

  const rideCategory = getCategory(form.carModel, form.carSeats);
  if (rideCategory === "Unknown") {
    Alert.alert("Error", "Unable to determine ride category. Please check your inputs.");
    return;
  }

  setLoading(true);
  try {
    await setDoc(doc(db, "driverDetails", user.uid), {
      username: user.userName,
      phone: user.phone,
      uid: user.uid,
      rideCategory, // Add ride category to the database
      ...form,
    });

    setDriver({
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      rideCategory, // Add ride category to the store
      ...form,
    });

    router.replace("/driver-dash");
  } catch (error) {
    console.error("Error saving driver details:", error);
    Alert.alert("Error", "An error occurred while registering. Please try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-5 mt-10">
        <Text className="text-2xl text-black font-JakartaSemiBold">
          Vehicle & Driver Information 🚗
        </Text>

        {/* Profile Image Picker */}
        <View className="my-4">
          <Text className="text-sm text-gray-700 mb-2">Profile Image</Text>
          <TouchableOpacity onPress={pickImage}>
            {form.profileImageUrl ? (
              <Image
                source={{ uri:imageUrl }}
                style={{ width: 100, height: 100, borderRadius: 50,resizeMode: 'fit' }}
              />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "#eaeaea",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text className="text-gray-500">Add Image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Other input fields */}
        {/* ... (existing fields for car model, plate, etc.) */}
   {/* Car Model Dropdown */}
   <View className="my-4">
          <Text className="text-sm text-gray-700 mb-2">Car Model</Text>
          <View className="border border-gray-300 rounded-lg">
            <Picker
              selectedValue={form.carModel}
              onValueChange={(value) => setForm({ ...form, carModel: value })}
            >
              <Picker.Item label="Select Car Model" value="Select Car Model" />
              {carModels.map((model, index) => (
                <Picker.Item key={index} label={model.name} value={model.name} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Plate/Registration Number */}
        <InputField
          label="Plate/Registration Number"
          placeholder="KDD123F"
          value={form.plate.toLocaleUpperCase()}
          onChangeText={(value) => setForm({ ...form, plate: value })}
        />

        {/* License Number */}
        <InputField
          label="License Number"
          placeholder="DL12345678"
          value={form.licenseNumber.toLocaleUpperCase()}
          onChangeText={(value) => setForm({ ...form, licenseNumber: value })}
        />

        {/* Car Seats */}
        <InputField
          label="Car Seats"
          placeholder="4"
          value={form.carSeats}
          keyboardType="numeric"
          onChangeText={(value) => setForm({ ...form, carSeats: value })}
        />

        {/* Vehicle Color */}
        <InputField
          label="Vehicle Color"
          placeholder="Red"
          value={form.vehicleColor}
          onChangeText={(value) => setForm({ ...form, vehicleColor: value })}
        />

<View className="my-10"></View>



        <CustomButton
          title={loading ? "Registering..." : "Register"}
          onPress={onRegisterPress}
          className="mt-6"
          disabled={loading}
        />

        {loading && (
          <View className="flex justify-center items-center mt-4">
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}
      </View>
      <View className="my-20"></View>
    </ScrollView>
  );
};

export default DriverRegistration;
