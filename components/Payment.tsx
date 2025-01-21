import React, { useState } from "react";
import { Alert, Image, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ReactNativeModal } from "react-native-modal";

import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { PaymentProps } from "@/types/type";

const MpesaPayment = ({
  amount,
  onClose,
}: PaymentProps & { onClose?: () => void }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(true);



  const handleCloseModal = () => {
    setIsModalVisible(false);
    onClose?.(); // Call the onClose prop if provided
  };

  const handleMpesaPayment = async () => {
    // Validate phone number
  
    

    setIsLoading(true);

    try {
      // Call Daraja API to initiate STK push
      const mpesaResponse = await fetchAPI("http://192.168.225.178:3000/stkpush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerMSISDN: phoneNumber,
          amount: amount,
          // Add any additional required parameters for your Daraja API
        }),
      });
console.log(mpesaResponse);
     // Set success state
     setPaymentSuccess(true);
     setIsModalVisible(false);
    
    } catch (error) {
       // Set success state
       setPaymentSuccess(true);
       setIsModalVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ReactNativeModal
        isVisible={isModalVisible}
        onBackdropPress={handleCloseModal}
        onBackButtonPress={handleCloseModal}
        className="flex justify-end m-0"
      >
        <View className="bg-white p-6 rounded-t-3xl">
          <Text className="text-xl font-JakartaSemiBold mb-4">
            M-Pesa Payment
          </Text>

          <Text className="text-md font-JakartaRegular mb-4">
            Enter your M-Pesa phone number to complete the payment
          </Text>

          <TextInput
            placeholder="Enter M-Pesa Phone Number (e.g., 254712345678)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            className="border border-gray-300 rounded-lg px-4 py-3 mb-4 font-JakartaRegular"
          />

          <CustomButton
            title={isLoading ? "Processing..." : `Pay Ksh ${Math.round(amount / 10) * 10}`}
            onPress={handleMpesaPayment}
            disabled={isLoading}
            className="mb-4"
          />
        </View>
      </ReactNativeModal>

      <ReactNativeModal
        isVisible={false}
        onBackdropPress={() => {
          setPaymentSuccess(false);
          // router.push("/(root)/(tabs)/home");
        }}
      >
        <View className="flex flex-col items-center justify-center bg-white p-7 rounded-2xl">
          <Image source={images.check} className="w-28 h-28 mt-5" /> 

          <Text className="text-2xl text-center font-JakartaBold mt-5">
            Booking placed successfully
          </Text>

          <Text className="text-md text-general-200 font-JakartaRegular text-center mt-3">
            Thank you for your booking. Your reservation has been successfully
            placed. Please proceed with your trip.
          </Text>

          <CustomButton
            title="Back Home"
            onPress={() => {
              setPaymentSuccess(false);
              router.push("/(root)/(tabs)/home");
            }}
            className="mt-5"
          />
        </View>
      </ReactNativeModal>
    </>
  );
};

export default MpesaPayment;