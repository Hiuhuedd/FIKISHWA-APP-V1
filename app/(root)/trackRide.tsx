import React, { useState, useEffect } from "react";
import {
  Image,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from "react-native";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { useDriverStore, useLocationStore, useUserStore } from "@/store";
import RideLayout from "@/components/RideLayout";
import MpesaPayment from "@/components/Payment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { MapViewProps } from 'react-native-maps';

let MapView: any;
let Marker: any;
let PROVIDER_DEFAULT: any;
let Polyline: any;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  Polyline = Maps.Polyline;
}

interface CustomMapViewProps extends Partial<MapViewProps> {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  provider?: any;
  onMapReady?: () => void;
  ref?: any;
}

export const CustomMapView: React.FC<CustomMapViewProps> = (props) => {
  if (Platform.OS === 'web') {
    return null; // Or your web alternative
  }

  return <MapView {...props} />;
};

export const CustomMarker = (props: any) => {
  if (Platform.OS === 'web') {
    return null;
  }

  return <Marker {...props} />;
};

export const CustomPolyline = (props: any) => {
  if (Platform.OS === 'web') {
    return null;
  }

  return <Polyline {...props} />;
};

export { PROVIDER_DEFAULT };

const TrackRide = () => {
  // States
  const [paymentModal, setPaymentModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [chargingAmount, setChargingAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [times, setTimes] = useState();
  const [loadingValues, setLoadingValues] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState("mpesa");

  // Store values
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
  


  const { user } = useUserStore();
  const { selectedDriver, drivers } = useDriverStore();
  const driverDetails = drivers?.find((driver) => driver.uid === selectedDriver);

  const startLatitude = pickUpLatitude || userLatitude;
  const startLongitude = pickUpLongitude || userLongitude;
  const startAddress = pickUpAddress || userAddress;

  const orsAPIKey = "5b3ce3597851110001cf6248a7377a4f09044b5782559c2687a49270";

  // Cancellation reasons
  const cancellationReasons = [
    "Driver is taking too long",
    "Changed my mind",
    "Wrong pickup location",
    "Price too high",
    "Emergency",
    "Other"
  ];

  const CancelModal = () => (
    <Modal
      transparent
      visible={cancelModal}
      animationType="fade"
      onRequestClose={() => setCancelModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cancelModalContent}>
              <Text style={styles.cancelModalTitle}>Cancel Ride</Text>
              <Text style={styles.cancelModalText}>
                Are you sure you want to cancel this ride?
              </Text>
              <View style={styles.cancelModalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setCancelModal(false)}
                >
                  <Text style={styles.cancelModalButtonText}>Keep Ride</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelModalButton, styles.cancelModalButtonDanger]}
                  onPress={handleCancelRide}
                >
                  <Text style={[styles.cancelModalButtonText, styles.cancelModalButtonTextDanger]}>
                    Yes, Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
// Add this function with your other functions
const confirmCancellation = async () => {
  setShowReasonModal(true);
  try {
    const db = getFirestore();
    const rideDocRef = doc(db, "driverNotifications", selectedDriver);
    
    await setDoc(rideDocRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      rideId: user.uid,
      cancellationReason: selectedReason,
      startAddress: startAddress,
      destinationAddress: destinationAddress,
      startLongitude: startLongitude,
      startLatitude: startLatitude,
      destinationLongitude: destinationLongitude,
      destinationLatitude: destinationLatitude,
      customerDetails: user,
      driverDetails: driverDetails
    });
    
   
    
    setShowReasonModal(false);
    router.back();
  } catch (error) {
    console.error("Error cancelling ride:", error);
    Alert.alert("Error", "Failed to cancel ride");
  }
};
  const ReasonModal = () => (
    <Modal
      transparent
      visible={showReasonModal}
      animationType="fade"
      onRequestClose={() => setShowReasonModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowReasonModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cancelModalContent}>
              <Text style={styles.cancelModalTitle}>Why are you cancelling?</Text>
              <View style={styles.reasonsContainer}>
                {cancellationReasons.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonButton,
                      selectedReason === reason && styles.reasonButtonSelected
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <Text style={[
                      styles.reasonText,
                      selectedReason === reason && styles.reasonTextSelected
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.cancelModalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setShowReasonModal(false)}
                >
                  <Text style={styles.cancelModalButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cancelModalButton,
                    styles.cancelModalButtonDanger,
                    !selectedReason && styles.cancelModalButtonDisabled
                  ]}
                  onPress={confirmCancellation}
                  disabled={!selectedReason}
                >
                  <Text style={[styles.cancelModalButtonText, styles.cancelModalButtonTextDanger]}>
                    Confirm Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const fetchRoute = async () => {
    if (!userLongitude || !userLatitude || !destinationLongitude || !destinationLatitude) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsAPIKey}&start=${startLongitude},${startLatitude}&end=${destinationLongitude},${destinationLatitude}&geometries=geojson`
      );

      const data = await response.json();
      const distanceInMeters = data.features[0].properties.segments[0].distance;
      const distanceInKilometers = distanceInMeters / 1000;
    
      const fareAmount = await AsyncStorage.getItem("selectedRideAmountPerKm");
      const calculatedFare = Number(fareAmount) * distanceInKilometers;
      const finalFare = Math.max(calculatedFare, 250);
      setChargingAmount(Math.round(finalFare / 10) * 10);
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
      const timeInSeconds = data.features[0].properties.segments[0].duration;

      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);

      const formattedTime = `${hours > 0 ? `${hours}h ` : ""}${minutes}min`;
      setTimes(formattedTime);
    } catch (error) {
      console.error("Error fetching travel time:", error);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingValues(false);
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log(driverDetails);
    
    fetchTimes();
    fetchRoute();
  }, [userLongitude, userLatitude, destinationLongitude, destinationLatitude]);


  const handleCancelRide = async () => {
    try {
      const db = getFirestore();
      const rideDocRef = doc(db, "driverNotifications", selectedDriver);
      
      await setDoc(rideDocRef, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        rideId: user.uid,
      });
      
      setCancelModal(false);
      // Add navigation logic here
      // router.back();
  setShowReasonModal(true);

    } catch (error) {
      console.error("Error cancelling ride:", error);
    }
  };

  // Your existing fetchRoute and fetchTimes functions here...
  const paymentMethods = [
    {
      id: "mpesa",
      name: "MPesa",
      description: "We accept mpesa to add more security measures of the payment infrastructure",
      icon: { uri: "https://www.pinnoserv.co.ke/images/pinno/feature-intro/PinnoM-PesaBankDataAnalyticsTool.png" },
    },
  ];
  return (
    <RideLayout title="Ride Status" snapPoints={["25%", "75%"]}>
      <>
        <View style={styles.driverContainer}>
          <Image
            source={{ uri: driverDetails?.profileImageUrl }}
            style={styles.driverImage}
          />
          
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {driverDetails?.name || "Your Driver"}
            </Text>
            <Text style={styles.vehicleInfo}>
              {driverDetails?.vehicleModel} • {driverDetails?.plateNumber}
            </Text>
          </View>

          <View style={styles.etaInfo}>
            <Text style={styles.etaLabel}>Driver is on the way!</Text>
            <Text style={styles.etaValue}>{times}</Text>
          </View>

          <TouchableOpacity
            style={styles.cancelRideButton}
            onPress={() => setCancelModal(true)}
          >
            <Text style={styles.cancelRideText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.paymentSheet}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          
          <View style={styles.methodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity 
                key={method.id} 
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.methodCardSelected
                ]}
                onPress={() => setSelectedMethod("mpesa")}
              >
                <View style={styles.methodInfo}>
                  <Image source={method.icon} style={styles.methodIcon} />
                  <View>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.description}>{method.description}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedMethod === method.id && styles.radioButtonSelected
                ]} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.payButton}
            onPress={() => setPaymentModal(true)}
          >
            <Text style={styles.payButtonText}>
              Continue to pay {chargingAmount ? `KES ${Math.round(chargingAmount / 10) * 10}` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Modal */}
        <CancelModal />
        <ReasonModal /> {/* Add this line */}

        {/* MPesa Payment Modal */}
        {paymentModal && chargingAmount && (
          <MpesaPayment
            amount={(Math.round(chargingAmount / 10) * 10)}
            onClose={() => setPaymentModal(false)}
            fullName=""
            email=""
            driverId={0}
            rideTime={0}
          />
        )}
      </>
    </RideLayout>
  );
};

const styles = StyleSheet.create({
  driverContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  driverImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
  },
  etaInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  etaLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  cancelRideButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff4d4f',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelRideText: {
    color: '#ff4d4f',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  cancelModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  cancelModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButtonDanger: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff4d4f',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  cancelModalButtonTextDanger: {
    color: '#ff4d4f',
  },
  paymentSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  methodCardSelected: {
    borderColor: '#4A45FF',
    backgroundColor: '#f0f0ff',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    color: '#666',
    fontSize: 12,
    maxWidth: 250,
    marginTop: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioButtonSelected: {
    borderColor: '#4A45FF',
    backgroundColor: '#4A45FF',
  },
  payButton: {
    backgroundColor: '#4A45FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
   // Add these new styles
   reasonsContainer: {
    marginVertical: 16,
    gap: 8,
  },
  reasonButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  reasonButtonSelected: {
    borderColor: '#4A45FF',
    backgroundColor: '#f0f0ff',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
  },
  reasonTextSelected: {
    color: '#4A45FF',
    fontWeight: '500',
  },
  cancelModalButtonDisabled: {
    opacity: 0.5,
  },

});

export default TrackRide;