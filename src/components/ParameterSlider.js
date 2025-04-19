import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

const ParameterSlider = ({
  label,
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  minimumLabel,
  maximumLabel,
  description,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueText}>{value}</Text>
      </View>
      
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor="#007bff"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#007bff"
      />
      
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeLabel}>{minimumLabel || minimumValue}</Text>
        <Text style={styles.rangeLabel}>{maximumLabel || maximumValue}</Text>
      </View>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007bff',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -12,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#888',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default ParameterSlider; 