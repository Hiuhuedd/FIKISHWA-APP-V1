import { useSignUp } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {  createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { db,auth } from './firebase';  // Firebase config import
import { collection, doc, setDoc } from "firebase/firestore";
import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import { icons, images } from "@/constants";
import { useUserStore } from "@/store";

interface DriverFormState {
  username: string;
  email: string;
  password: string;
  phone: string;
}

interface VerificationState {
  isRequired: boolean;
  code: string;
  error: string;
}

const DriverSignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useUserStore(); // Get the setUser function from Zustand store

  // Form state
  const [form, setForm] = useState<DriverFormState>({
    username: "",
    email: "",
    password: "",
    phone: "",
  });

  // Verification state
  const [verification, setVerification] = useState<VerificationState>({
    isRequired: false,
    code: "",
    error: "",
  });

  // Form validation
  const validateForm = () => {
    if (!form.username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return false;
    }

    if (!form.email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return false;
    }

    if (!form.phone.trim() || !/^\d+$/.test(form.phone)) {
      Alert.alert("Error", "Please enter a valid phone number");
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
      await sendEmailVerification(userCredential.user);

      // Determine user type based on email prefix (e.g., 'driver_' for drivers)
      const userType =  "driver";

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
      router.push("/driver-reg")
   
    } catch (err) {
      console.error("SignUp error:", err);
      Alert.alert("Error", err.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 bg-white">
          <View className="relative w-full h-[250px]">
            <Image
              source={images.signUpCar}
              className="z-0 w-full h-[250px]"
              resizeMode="cover"
            />
            <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
              Sign Up as a Driver
            </Text>
          </View>

          <View className="p-5">
            <InputField
              label="Username"
              placeholder="Choose a username"
              icon={icons.person}
              value={form.username}
              onChangeText={(value) =>
                setForm((prev) => ({
                  ...prev,
                  username: value.toLowerCase().replace(/\s+/g, "_"),
                }))
              }
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
              label="Phone Number"
              placeholder="Enter your phone number"
              // icon={icons.phone}
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

            <Link
              href="/sign-in"
              className="text-lg text-center text-general-200 mt-10"
            >
              Already have an account?{" "}
              <Text className="text-primary-500">Log In</Text>
            </Link>

            <Link
              href="/sign-up"
              className="text-lg text-center text-general-200 mt-6"
            >
              Sign up as a User
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DriverSignUp;
