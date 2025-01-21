// components/ui/badge.js
import React from 'react';
import { View, Text } from 'react-native';

const getVariantStyles = (variant) => {
  const baseClasses = "px-2 py-1 rounded-full";
  
  const variants = {
    default: {
      container: `${baseClasses} bg-gray-100`,
      text: "text-gray-700"
    },
    primary: {
      container: `${baseClasses} bg-blue-100`,
      text: "text-blue-700"
    },
    secondary: {
      container: `${baseClasses} bg-purple-100`,
      text: "text-purple-700"
    },
    success: {
      container: `${baseClasses} bg-green-100`,
      text: "text-green-700"
    },
    destructive: {
      container: `${baseClasses} bg-red-100`,
      text: "text-red-700"
    },
    warning: {
      container: `${baseClasses} bg-yellow-100`,
      text: "text-yellow-700"
    }
  };

  return variants[variant] || variants.default;
};

export const Badge = ({ 
  children, 
  variant = "default", 
  className = "", 
  textClassName = "" 
}) => {
  const styles = getVariantStyles(variant);
  
  return (
    <View className={`${styles.container} ${className}`}>
      <Text className={`text-sm font-medium ${styles.text} ${textClassName}`}>
        {children}
      </Text>
    </View>
  );
};