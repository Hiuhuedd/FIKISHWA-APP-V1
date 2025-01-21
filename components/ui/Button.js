// components/ui/button.js
import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';

const getVariantStyles = (variant) => {
  const baseClasses = {
    button: "flex-row items-center justify-center px-4 py-3 rounded-lg",
    text: "text-base font-semibold text-center"
  };

  const variants = {
    default: {
      button: `${baseClasses.button} bg-gray-900`,
      text: `${baseClasses.text} text-white`,
      pressed: "opacity-80",
      disabled: "bg-gray-200",
      disabledText: "text-gray-400"
    },
    primary: {
      button: `${baseClasses.button} bg-blue-600`,
      text: `${baseClasses.text} text-white`,
      pressed: "opacity-80",
      disabled: "bg-blue-200",
      disabledText: "text-blue-100"
    },
    secondary: {
      button: `${baseClasses.button} bg-gray-100 border border-gray-200`,
      text: `${baseClasses.text} text-gray-900`,
      pressed: "bg-gray-200",
      disabled: "bg-gray-50",
      disabledText: "text-gray-300"
    },
    destructive: {
      button: `${baseClasses.button} bg-red-600`,
      text: `${baseClasses.text} text-white`,
      pressed: "opacity-80",
      disabled: "bg-red-200",
      disabledText: "text-red-100"
    },
    outline: {
      button: `${baseClasses.button} border border-gray-200 bg-transparent`,
      text: `${baseClasses.text} text-gray-900`,
      pressed: "bg-gray-100",
      disabled: "border-gray-100",
      disabledText: "text-gray-300"
    },
    ghost: {
      button: `${baseClasses.button} bg-transparent`,
      text: `${baseClasses.text} text-gray-900`,
      pressed: "bg-gray-100",
      disabled: "bg-transparent",
      disabledText: "text-gray-300"
    },
    link: {
      button: `${baseClasses.button} bg-transparent p-0`,
      text: `${baseClasses.text} text-blue-600 underline`,
      pressed: "opacity-80",
      disabled: "bg-transparent",
      disabledText: "text-gray-300"
    }
  };

  return variants[variant] || variants.default;
};

export const Button = ({ 
  children,
  variant = "default",
  size = "default",
  icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  onPress,
  className = "",
  textClassName = ""
}) => {
  const styles = getVariantStyles(variant);
  
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-2 text-sm";
      case "lg":
        return "px-6 py-4 text-lg";
      default:
        return "px-4 py-3 text-base";
    }
  };

  const renderContent = () => (
    <>
      {loading && (
        <ActivityIndicator 
          size="small" 
          color={variant === "secondary" || variant === "outline" || variant === "ghost" ? "#1f2937" : "#ffffff"}
          className="mr-2"
        />
      )}
      {icon && iconPosition === "left" && !loading && (
        <View className="mr-2">{icon}</View>
      )}
      <Text 
        className={`
          ${styles.text} 
          ${disabled ? styles.disabledText : ""} 
          ${getSizeClasses()} 
          ${textClassName}
        `}
      >
        {children}
      </Text>
      {icon && iconPosition === "right" && !loading && (
        <View className="ml-2">{icon}</View>
      )}
    </>
  );

  return (
    <Pressable
      onPress={!disabled && !loading ? onPress : null}
      className={`
        ${styles.button}
        ${getSizeClasses()}
        ${disabled ? styles.disabled : ""}
        ${className}
      `}
      style={({ pressed }) => [
        pressed && !disabled && !loading ? { opacity: 0.8 } : {}
      ]}
      disabled={disabled || loading}
    >
      {renderContent()}
    </Pressable>
  );
};