import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const StylePresetSelector = ({ presets, selectedStyle, onSelectStyle }) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetButton,
              selectedStyle === preset.id && styles.selectedPresetButton
            ]}
            onPress={() => onSelectStyle(preset.id)}
          >
            <Text 
              style={[
                styles.presetText,
                selectedStyle === preset.id && styles.selectedPresetText
              ]}
            >
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Description of selected style */}
      {presets.find(p => p.id === selectedStyle)?.description && (
        <Text style={styles.descriptionText}>
          {presets.find(p => p.id === selectedStyle)?.description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  scrollView: {
    flexDirection: 'row',
  },
  scrollContent: {
    paddingVertical: 8,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedPresetButton: {
    backgroundColor: '#007bff',
  },
  presetText: {
    fontSize: 14,
    color: '#333',
  },
  selectedPresetText: {
    color: '#fff',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
});

export default StylePresetSelector; 