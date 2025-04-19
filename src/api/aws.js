import { Auth, API } from 'aws-amplify';
import awsConfig from '../config/aws-config';

/**
 * Initialize AWS services with configuration
 */
export const initializeAWS = () => {
  // Configure AWS with settings from config file
  API.configure(awsConfig);
};

/**
 * Get current AWS credentials
 * @returns {Promise<Object>} - AWS credentials
 */
export const getCurrentCredentials = async () => {
  try {
    const credentials = await Auth.currentCredentials();
    return credentials;
  } catch (error) {
    console.error('Error getting credentials:', error);
    throw error;
  }
};

/**
 * Make API call to AWS API Gateway
 * @param {string} apiName - API name as defined in aws-config.js
 * @param {string} path - API path/endpoint
 * @param {Object} options - Request options (method, body, etc.)
 * @returns {Promise<Object>} - API response
 */
export const callAPI = async (apiName, path, options = {}) => {
  try {
    const response = await API.post(apiName, path, options);
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

/**
 * Check if AWS is properly configured
 * @returns {boolean} - True if configured, false otherwise
 */
export const isAWSConfigured = () => {
  return !!(awsConfig.Auth && awsConfig.Auth.identityPoolId);
};

/**
 * Get AWS region from config
 * @returns {string} - AWS region
 */
export const getAWSRegion = () => {
  return awsConfig.region;
}; 