import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Components
import ImageGeneratorForm from '../components/ImageGeneratorForm';
import GeneratedImage from '../components/GeneratedImage';
import LoadingIndicator from '../components/LoadingIndicator';

// Hooks
import useImageGeneration from '../hooks/useImageGeneration';
import { useAWS } from '../context/AWSContext';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { isConfigured, isLoading: isAWSLoading, error: awsError } = useAWS();
  
  const {
    parameters,
    updateParameters,
    generatedImage,
    isGenerating,
    error,
    generateImage,
    resetImage,
    generateRandomSeed
  } = useImageGeneration();

  // Check AWS configuration on initial load
  useEffect(() => {
    if (!isAWSLoading && !isConfigured && !awsError) {
      Alert.alert(
        'AWS Not Configured',
        'AWS credentials are not properly configured. Would you like to go to settings?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }
        ]
      );
    }
  }, [isConfigured, isAWSLoading, awsError, navigation]);

  // Show error alert if generation fails
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with settings and gallery buttons */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#007bff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Image Generator</Text>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Ionicons name="images-outline" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {isAWSLoading ? (
            <LoadingIndicator message="Initializing AWS..." />
          ) : generatedImage ? (
            <GeneratedImage 
              imageData={generatedImage} 
              onClear={resetImage}
            />
          ) : (
            <ImageGeneratorForm 
              parameters={parameters}
              onUpdateParameters={updateParameters}
              onGenerate={generateImage}
              isGenerating={isGenerating}
              onGenerateRandomSeed={generateRandomSeed}
            />
          )}

          {isGenerating && (
            <LoadingIndicator 
              message="Generating image..." 
              fullScreen={true} 
            />
          )}
        </ScrollView>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});

export default HomeScreen; 