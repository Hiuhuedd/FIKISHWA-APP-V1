import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import {
  Text,
  Animated,
  View,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import GoogleTextInput from "@/components/GoogleTextInput";
import GoogleTextInputPick from "@/components/GoogleTextInputPick";
import Map from "@/components/Map";
import { icons, images } from "@/constants";
import { useLocationStore, useUserStore } from "@/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomButton from "@/components/CustomButton";

const Home = () => {
  // Store hooks
  const locationStore = useLocationStore();
  const { user } = useUserStore();
  const { signOut } = useAuth();

  // Destructure location store values
  const {
    userAddress,
    setUserLocation,
    setDestinationLocation,
    setPickUpLocation,
  } = locationStore;

  // UI State
  const [uiState, setUiState] = useState({
    collapseAnim: new Animated.Value(0),
    isMenuOpen: false,
    loading: true
  });

  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  // Memoized values
  const snapPoints = useMemo(() => ["30%", "85%", "85%"], []);

  const menuAnimation = useMemo(() => 
    uiState.collapseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [Dimensions.get("window").width * -0.8, 0],
    }), [uiState.collapseAnim]);

  // Handlers
  const handleInputFocus = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(2);
  }, []);
  
  const handleInputBlur = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      Alert.alert("Sign Out Failed", "Please try again.");
    }
  }, [signOut]);

  const toggleMenu = useCallback(() => {
    setUiState(prev => {
      const newIsOpen = !prev.isMenuOpen;
      Animated.timing(prev.collapseAnim, {
        toValue: newIsOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return { ...prev, isMenuOpen: newIsOpen };
    });
  }, []);

  const handleRoute = useCallback(() => {
    setPickUpLocation({});
    router.push("/(root)/confirm-ride");
  }, [setPickUpLocation]);

  const handleDestinationSelect = useCallback((location) => {
    setDestinationLocation(location);
  }, [setDestinationLocation]);

  const handlePickupSelect = useCallback((location) => {
    setPickUpLocation(location);
    handleInputBlur();
    router.push("/(root)/confirm-ride");
  }, [setPickUpLocation, handleInputBlur]);

  // Effects
  useEffect(() => {
    const initializeLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync(location.coords);
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `${address[0]?.name}, ${address[0]?.region}`,
      });
    };

    initializeLocation();
  }, [setUserLocation]);

  useEffect(() => {
    let locationSubscription: NodeJS.Timeout;
  
    const updateLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
  
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const address = await Location.reverseGeocodeAsync(location.coords);
  
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: `${address[0]?.name}, ${address[0]?.region}`,
        };

        await AsyncStorage.setItem('userLocation', JSON.stringify(locationData));
      } catch (error) {
        console.error("Error updating location:", error);
      }
    };
  
    updateLocation();
    locationSubscription = setInterval(updateLocation, 50000);
  
    return () => clearInterval(locationSubscription);
  }, []);

  // Memoized Components
  const MenuButton = useMemo(() => (
    <TouchableOpacity
      className="absolute top-11 right-8 z-50 bg-black rounded-full items-center justify-center"
      style={{ width: 50, height: 50, borderRadius: 25 }}
      onPress={toggleMenu}
    >
      <Text className="text-white text-xl font-bold">
        {user?.userName?.[0]?.toUpperCase()}
      </Text>
    </TouchableOpacity>
  ), [user?.userName, toggleMenu]);

  const SlidingMenu = useMemo(() => (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "70%",
        height: "100%",
        backgroundColor: "#fff",
        transform: [{ translateX: menuAnimation }],
        zIndex: 111,
      }}
    >
      <View className="relative w-full h-[100px]">
        <Image source={images.noResult} className="z-0 w-full h-[250px]" />
      </View>
      
      {/* Menu Content */}
      <View className="flex flex-col items-start justify-start p-6 space-y-6">
        {/* ... Menu items ... */}
        {/* (Keep existing menu content) */}
      </View>
    </Animated.View>
  ), [menuAnimation, user?.userName, handleSignOut]);

  return (
    <GestureHandlerRootView className="flex-1">
      <TouchableWithoutFeedback onPress={() => uiState.isMenuOpen && toggleMenu()}>
        <View className="flex-1 bg-white">
          {/* Search Input */}
          <View className="absolute top-10 w-full px-5 z-10">
            <GoogleTextInput
              placeHoldertext="Where are you going to"
              icon={icons.search}
              containerStyle="bg-white shadow-md"
              handlePress={handleDestinationSelect}
            />
          </View>

          {SlidingMenu}
          {MenuButton}
          <Map />

          <BottomSheet ref={bottomSheetRef} snapPoints={snapPoints} index={0}>
            <BottomSheetScrollView>
              <View className="flex-1 bg-white">
                <View className="absolute top-0 w-full items-center px-5 z-10">
                  <View className="flex flex-row items-center justify-start mt-3 w-full py-3 px-3">
                    <Image 
                      source={icons.point} 
                      className="w-6 h-6" 
                      style={{resizeMode: 'contain'}}
                    />
                    <Text className="text-lg font-JakartaRegular ml-2 text-sky-700">
                      {userAddress}
                    </Text>
                  </View>

                  <GoogleTextInputPick
                    icon={icons.search}
                    placeHoldertext="Set pick up location"
                    containerStyle="bg-white shadow-md"
                    handlePress={handlePickupSelect}
                    onFocus={handleInputFocus}
                  />

                  <CustomButton
                    onPress={handleRoute}
                    title="Proceed with current location"
                    className="mt-5 w-[98%] rounded-2xl py-4 bg-black rounded-md"
                  />
                </View>
              </View>
            </BottomSheetScrollView>
          </BottomSheet>
        </View>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
};

export default memo(Home);