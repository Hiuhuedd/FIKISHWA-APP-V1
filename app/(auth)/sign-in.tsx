import { useState, useCallback } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { Link, useRouter } from "expo-router"; // Router hook
import { useUserStore } from "@/store"; // Import your user store

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import { icons, images } from "@/constants";
import { app } from "./firebase"; // Firebase app import
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Firestore import

const SignIn = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const db = getFirestore(app); // Firestore instance

  const { setUser } = useUserStore(); // Get the setUser function from Zustand store

  const onSignInPress = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors

    const auth = getAuth(app); // Firebase Auth instance

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;
      // console.log("User signed in:", user);

      // Fetch user type from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userType = userData?.userType || "user"; // Default to "user" if not found
console.log(userData);

        // Set the user data in the store
        setUser({
          uid: user.uid,
          email: user.email,
          userType: userType,
          userName:userData.username,
          phone:userData.phone
        });

        // Redirect based on user type
        if (userType === "driver") {
          const driverDoc = await getDoc(doc(db, "driverDetails", user.uid));
      
          if (driverDoc.exists()) {
            const userData = driverDoc.data();
   if(!userData.carModel){
    router.replace("/driver-reg");

   }else{
     router.replace("/driver-dash");

   }
    
          } else{
            router.replace("/driver-reg");

          }
          // Driver-specific route
        } else {
          router.replace("/(root)/(tabs)/home"); // General user route
        }
      } else {
        setError("User data not found in Firestore.");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "An error occurred during sign in.");
    } finally {
      setLoading(false); // End loading
    }
  }, [form, router, db, setUser]);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        <View className="relative w-full h-[250px]">
          <Image source={images.signUpCar} className="z-0 w-full h-[250px]" />
          <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
       Ride With Fikishwa!
          </Text>
      
        </View>

        <View className="p-5">
          <InputField
            label="Email"
            placeholder="Enter email"
            icon={icons.email}
            textContentType="emailAddress"
            value={form.email}
            onChangeText={(value) => setForm({ ...form, email: value })}
          />

          <InputField
            label="Password"
            placeholder="Enter password"
            icon={icons.lock}
            secureTextEntry={true}
            textContentType="password"
            value={form.password}
            onChangeText={(value) => setForm({ ...form, password: value })}
          />

          <CustomButton
            title={loading ? "Signing In..." : "Sign In"}
            onPress={onSignInPress}
            className="mt-6"
          />

          {error && (
            <Text className="text-red-500 text-center mt-4">{error}</Text>
          )}

          <Link
            href="/sign-up"
            className="text-lg text-center text-general-200 mt-10"
          >
            Don't have an account?{" "}
            <Text className="text-primary-500">Sign Up</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
};

export default SignIn;
