import { useState } from "react";
import { Alert, Text, View, ScrollView, KeyboardAvoidingView, Platform, Image } from "react-native";
import {  createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { db,auth } from './firebase';  // Firebase config import
import { collection, doc, setDoc } from "firebase/firestore";
import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import * as Linking from 'expo-linking';
import { icons, images } from "@/constants";
import { Link, router } from "expo-router";
import { useUserStore } from "@/store";

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
  });

  const { setUser } = useUserStore(); // Get the setUser function from Zustand store

  // Add these functions above your component
  const openPrivacyPolicy = () => {
    Linking.openURL('https://fikishwa-13a26.web.app/');
  };
  
  const openSafety = () => {
    Linking.openURL('https://fikishwa-13a26.web.app/');
  };
  

  const validateForm = () => {
    if (!form.username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return false;
    }
    if (!form.email.trim()) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    if (!form.password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return false;
    }
    if (form.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const onSignUpPress = async () => {
    if (isLoading) return;
    if (!validateForm()) return;

    try {
      setIsLoading(true);
       // Get Firebase Auth instance

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // Update the user's profile
      await updateProfile(userCredential.user, {
        displayName: form.username,
      });

      // Optionally, send email verification
  

      // Determine user type based on email prefix (e.g., 'driver_' for drivers)
      const userType =  "user";

      // Save the user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        username: form.username,
        email: form.email,
        phone: form.phone,
        userType: userType,  // Store userType as part of the document
      });
      setUser({
        uid: userCredential.user.uid,
        email: form.email,
        userType: userType,
        userName:form.username,
        phone:form.phone
      });

      router.replace("/(root)/(tabs)/home"); // General user route

    } catch (err) {
      console.error("SignUp error:", err);
      Alert.alert("Error", err.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 bg-white">
          <View className="relative w-full h-[150px]">
            <Image source={images.signUpCar} className="z-0 w-full h-[150px]" resizeMode="cover" />
            <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
              Create Your Account
            </Text>
          </View>

          <View className="p-5">
            <InputField
              label="Username"
              placeholder="Choose a username"
              icon={icons.person}
              value={form.username}
              onChangeText={(value) => setForm((prev) => ({ ...prev, username: value.toLowerCase().replace(/\s+/g, "_") }))}
              autoCapitalize="none"
            />
            <InputField
              label="Email"
              placeholder="Enter your email"
              icon={icons.email}
              value={form.email}
              onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} 
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <InputField
              label="Phone"
              placeholder="Enter your phone number"
              value={form.phone}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} 
              keyboardType="phone-pad"
              autoCapitalize="none"
              textContentType="telephoneNumber"
            />
            <InputField
              label="Password"
              placeholder="Create password"
              icon={icons.lock}
              value={form.password}
              onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))} 
              secureTextEntry
              textContentType="newPassword"
            />
            <CustomButton
              title={isLoading ? "Creating Account..." : "Sign Up"}
              onPress={onSignUpPress}
              disabled={isLoading}
              className="mt-6"
            />
          </View>
          <Link
            href="/sign-in"
            className="text-lg text-center text-general-200 mt-10"
          >
            already have an account?{" "}
            <Text className="text-primary-500">Sign In</Text>
          </Link>
          <Link
            href="/driver"
            className="text-lg text-center text-general-200 mt-2"
          >
            Sign up as Rider?{" "}
          </Link>
         {/* Privacy Policy and Safety Links */}
<View className="flex-row justify-center items-center mt-4 mb-6 px-4">
  <Text 
    onPress={openPrivacyPolicy}
    className="text-sm text-center text-general-200 underline"
  >
    Privacy Policy
  </Text>
  <Text className="text-general-200 mx-2">•</Text>
  <Text
    onPress={openSafety}
    className="text-sm text-center text-general-200 underline"
  >
    Safety Guidelines
  </Text>
</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
