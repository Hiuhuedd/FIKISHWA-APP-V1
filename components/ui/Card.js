// components/ui/card.js
import React from 'react';
import { View, Text } from 'react-native';

export const Card = ({ children, className = '' }) => (
  <View className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
    {children}
  </View>
);

export const CardHeader = ({ children, className = '' }) => (
  <View className={`mb-3 ${className}`}>
    {children}
  </View>
);

export const CardTitle = ({ children, className = '' }) => (
  <Text className={`text-xl font-semibold text-gray-900 ${className}`}>
    {children}
  </Text>
);

export const CardContent = ({ children, className = '' }) => (
  <View className={`${className}`}>
    {children}
  </View>
);