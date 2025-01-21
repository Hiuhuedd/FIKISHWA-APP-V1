import { TextInputProps, TouchableOpacityProps } from "react-native";

declare interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
}

declare interface MarkerData {
  uid: any;
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  first_name: string;
  last_name: string;
  time?: number;
  price?: string;
  model:string,
  color:string,
  plate:string
}

declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

declare interface Ride1 {
  origin_address: string;
  destination_address: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  ride_time: number;
  fare_price: number;
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  driver: {
    first_name: string;
    last_name: string;
    car_seats: number;
  };
}



declare interface Ride {
  ride_id: string; // Updated to include `ride_id` as a string
  origin_address: string;
  destination_address: string;
  origin_latitude: string; // Changed to string based on provided data
  origin_longitude: string; // Changed to string based on provided data
  destination_latitude: string; // Changed to string based on provided data
  destination_longitude: string; // Changed to string based on provided data
  ride_time: number;
  fare_price: string; // Changed to string based on provided data
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  driver: {
    driver_id: string; // Added `driver_id` as a string
    first_name: string;
    last_name: string;
    profile_image_url: string; // Added `profile_image_url`
    car_image_url: string; // Added `car_image_url`
    car_seats: number;
    rating: string; // Added `rating` as a string
  };
}




declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}

declare interface GoogleInputProps {
  icon?: string;
  initialLocation?: string;
  containerStyle?: string;
  textInputBackgroundColor?: string;
  handlePress: ({
    distance,
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: number;
  driverId: number;
  rideTime: number;
}

declare interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  pickUpLatitude:number| null,
  pickUpLongitude: number|null,
  pickUpAddress:string|null,
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;

  setPickUpLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface DriverStore {
  drivers: MarkerData[];
  selectedDriver: string | null;
  setSelectedDriver: (driverId: string) => void;
  setDrivers: (drivers: MarkerData[]) => void;
  clearSelectedDriver: () => void;
}

declare interface DriverCardProps {
  item: MarkerData;
  selected: number;
  setSelected: () => void;
}

declare interface User {
  uid: string; // Unique identifier for the user
  email: string; // Email of the user
  userType: UserRole; // Type of user: driver, passenger, or admin
  firstName: string; // First name of the user
  lastName: string; // Last name of the user
  profileImageUrl?: string; // Optional: URL for the user's profile image
  carImageUrl?: string; // Optional: URL for the car image (for drivers)
  rating?: number; // Optional: Rating (for drivers)
  phone?: string; // Optional: User's phone number
  createdAt: string; // Timestamp when the user account was created
  updatedAt: string; // Timestamp when the user account was last updated
}

// Define the UserStore interface
declare interface UserStore {
  user: User | null; // Holds the current user
  userType: UserRole | null; // Current user's role
  setUser: (user: User) => void; // Set user
  clearUser: () => void; // Clear user
}
