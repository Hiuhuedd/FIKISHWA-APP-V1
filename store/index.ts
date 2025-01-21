import { create } from "zustand";
import { DriverStore, LocationStore, MarkerData } from "@/types/type";

export const useLocationStore = create<LocationStore>((set) => ({
  distance: null,
  userLatitude: null,
  userLongitude: null,
  cusLatitude: null,
  cusLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  pickUpLatitude: null,
  pickUpLongitude: null,
  pickUpAddress:null,
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    }));

    // If a driver is selected, clear the selected driver
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },

  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    }));
  },

  setPickUpLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      pickUpLatitude: latitude,
      pickUpLongitude: longitude,
      pickUpAddress: address,
    }));

    // If a driver is selected, clear the selected driver
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },
}));

// Create a store for managing user data
export const useUserStore = create((set) => ({
  user: null, // User will be an object or null initially
  userType: null, // Store user type (e.g., 'driver', 'user')
  setUser: (user: { uid: string; email: string; userType: string,userName:string,phone:string }) =>
    set(() => ({
      user: user,
      userType: user.userType,
    })),
  clearUser: () => set(() => ({ user: null, userType: null })),
}));
export const DriverDetailsStore = create((set) => ({
  driver: null, // User will be an object or null initially

  setDriver: (driver: { uid: string; carModel: string; plate: string,userName:string,phone:string }) =>
    set(() => ({
      driver: driver,

    })),
  clearUser: () => set(() => ({ driver: null })),
}));

// Driver store remains the same as before
export const useDriverStore = create<DriverStore>((set) => ({
  drivers: [],  
  selectedDriver: null,
  setSelectedDriver: (driverId: string) => set(() => ({ selectedDriver: driverId })),
  setDrivers: (drivers: MarkerData[]) => set(() => ({ drivers })),
  clearSelectedDriver: () => set(() => ({ selectedDriver: null })),
}));
