import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify, Auth } from 'aws-amplify';
import awsConfig from '../config/aws-config';

// Create context
const AWSContext = createContext(null);

// AWS context provider component
export const AWSContextProvider = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState(null);

  // Initialize AWS configuration
  useEffect(() => {
    const initializeAWS = async () => {
      try {
        console.log('Initializing AWS with config:', {
          region: awsConfig.region,
          hasAuth: !!awsConfig.Auth,
          hasIdentityPool: !!(awsConfig.Auth && awsConfig.Auth.identityPoolId),
          hasAPI: !!awsConfig.API
        });
        
        // Initialize Amplify with configuration
        Amplify.configure(awsConfig);
        
        // 設定が有効かチェック（エラーハンドリング用）
        if (!awsConfig.Auth || !awsConfig.Auth.identityPoolId) {
          console.warn('AWS設定が不完全です: Identity Pool IDが不足しています');
          setIsConfigured(false);
          setError('AWS設定が不完全です（Identity Pool ID不足）');
          setIsLoading(false);
          return;
        }
        
        // 認証情報の取得を試みる
        try {
          // Auth.currentCredentialsを呼び出して実際の認証情報を取得
          const currentCredentials = await Auth.currentCredentials();
          console.log('Credentials obtained successfully:', {
            authenticated: currentCredentials.authenticated,
            identityId: currentCredentials.identityId ? '存在します' : '存在しません',
          });
          
          // 認証情報をセット
          setCredentials({
            accessKeyId: currentCredentials.accessKeyId,
            secretAccessKey: currentCredentials.secretAccessKey,
            sessionToken: currentCredentials.sessionToken,
            identityId: currentCredentials.identityId,
            authenticated: currentCredentials.authenticated,
            expiration: currentCredentials.expiration
          });
        } catch (credError) {
          console.warn('認証情報の取得に失敗しましたが、続行します:', credError);
          // 開発用にフラグは有効にする（実運用環境では適切に処理する）
        }
        
        // Set configured flag
        setIsConfigured(true);
        setError(null);
      } catch (err) {
        console.error('Error initializing AWS:', err);
        setError('Failed to initialize AWS configuration: ' + err.message);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAWS();
  }, []);

  // 認証情報更新関数
  const refreshCredentials = async () => {
    try {
      setIsLoading(true);
      
      // Auth.currentCredentialsを呼び出して最新の認証情報を取得
      const currentCredentials = await Auth.currentCredentials();
      
      console.log('Refreshed credentials:', {
        authenticated: currentCredentials.authenticated,
        hasIdentityId: !!currentCredentials.identityId
      });
      
      // 認証情報をセット
      setCredentials({
        accessKeyId: currentCredentials.accessKeyId,
        secretAccessKey: currentCredentials.secretAccessKey,
        sessionToken: currentCredentials.sessionToken,
        identityId: currentCredentials.identityId,
        authenticated: currentCredentials.authenticated,
        expiration: currentCredentials.expiration
      });
      
      setError(null);
      return currentCredentials;
    } catch (err) {
      console.error('Error refreshing credentials:', err);
      setError('Failed to get AWS credentials: ' + err.message);
      setCredentials(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update AWS configuration
  const updateConfig = async (newConfig) => {
    try {
      setIsLoading(true);
      
      // Update configuration
      const updatedConfig = {
        ...awsConfig,
        ...newConfig
      };
      
      console.log('Updating AWS config with:', {
        region: updatedConfig.region,
        hasAuth: !!updatedConfig.Auth,
        hasAPI: !!updatedConfig.API
      });
      
      // Amplifyの設定を更新
      Amplify.configure(updatedConfig);
      
      // 認証情報をリフレッシュ
      try {
        await refreshCredentials();
      } catch (credError) {
        console.warn('設定更新後の認証情報リフレッシュに失敗:', credError);
        // 続行する
      }
      
      setIsConfigured(true);
      setError(null);
    } catch (err) {
      console.error('Error updating AWS config:', err);
      setError('Failed to update AWS configuration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const contextValue = {
    isConfigured,
    isLoading,
    credentials,
    error,
    refreshCredentials,
    updateConfig
  };

  return (
    <AWSContext.Provider value={contextValue}>
      {children}
    </AWSContext.Provider>
  );
};

// Custom hook to use AWS context
export const useAWS = () => {
  const context = useContext(AWSContext);
  
  if (!context) {
    throw new Error('useAWS must be used within an AWSContextProvider');
  }
  
  return context;
};

export default AWSContext; 