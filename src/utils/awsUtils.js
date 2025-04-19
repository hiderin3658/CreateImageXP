import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth } from 'aws-amplify';
import awsConfig from '../config/aws-config';

// Storage keys
const AWS_CONFIG_KEY = 'aws_config';
const AWS_CREDENTIALS_KEY = 'aws_credentials';

/**
 * Save AWS configuration to AsyncStorage
 * @param {Object} config - AWS configuration
 * @returns {Promise<void>}
 */
export const saveAWSConfig = async (config) => {
  try {
    const configToSave = {
      ...config,
      timestamp: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(AWS_CONFIG_KEY, JSON.stringify(configToSave));
  } catch (error) {
    console.error('Error saving AWS config:', error);
    throw error;
  }
};

/**
 * Load AWS configuration from AsyncStorage
 * @returns {Promise<Object|null>} - AWS configuration or null if not found
 */
export const loadAWSConfig = async () => {
  try {
    const configString = await AsyncStorage.getItem(AWS_CONFIG_KEY);
    if (!configString) return null;
    
    return JSON.parse(configString);
  } catch (error) {
    console.error('Error loading AWS config:', error);
    return null;
  }
};

/**
 * Validate AWS configuration format
 * @param {Object} config - AWS configuration to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateAWSConfig = (config) => {
  if (!config) return false;
  
  // Check for required fields
  const hasAuth = !!(config.Auth && config.Auth.identityPoolId);
  const hasRegion = !!config.region;
  const hasAPI = !!(config.API && config.API.endpoints);
  
  return hasAuth && hasRegion && hasAPI;
};

/**
 * Format AWS region for display
 * @param {string} region - AWS region code
 * @returns {string} - Formatted region name
 */
export const formatRegionName = (region) => {
  const regionMap = {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ca-central-1': 'Canada (Central)',
    'eu-central-1': 'EU (Frankfurt)',
    'eu-west-1': 'EU (Ireland)',
    'eu-west-2': 'EU (London)',
    'eu-west-3': 'EU (Paris)',
    'sa-east-1': 'South America (São Paulo)',
  };
  
  return regionMap[region] || region;
};

/**
 * Clear AWS credentials and config from storage
 * @returns {Promise<void>}
 */
export const clearAWSData = async () => {
  try {
    await AsyncStorage.multiRemove([AWS_CONFIG_KEY, AWS_CREDENTIALS_KEY]);
  } catch (error) {
    console.error('Error clearing AWS data:', error);
    throw error;
  }
}; 