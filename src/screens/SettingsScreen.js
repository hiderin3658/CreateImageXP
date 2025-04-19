import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAWS } from '../context/AWSContext';
import { saveAWSConfig, formatRegionName } from '../utils/awsUtils';
import LoadingIndicator from '../components/LoadingIndicator';

// List of available AWS regions
const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
];

const SettingsScreen = () => {
  const { isConfigured, isLoading, updateConfig, refreshCredentials } = useAWS();
  
  // Form state
  const [identityPoolId, setIdentityPoolId] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [apiName, setApiName] = useState('ImageGeneratorAPI');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current config into form
  useEffect(() => {
    if (isConfigured) {
      // TODO: Load existing config values when implemented
    }
  }, [isConfigured]);

  // Save AWS config
  const handleSave = async () => {
    if (!identityPoolId.trim()) {
      Alert.alert('Error', 'Please enter a valid Identity Pool ID');
      return;
    }
    
    if (!apiEndpoint.trim()) {
      Alert.alert('Error', 'Please enter a valid API endpoint');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Create new config object
      const newConfig = {
        region,
        Auth: {
          identityPoolId: identityPoolId,
          region,
        },
        API: {
          name: apiName,
          endpoints: [
            {
              name: 'generateImage',
              endpoint: apiEndpoint,
              region,
              service: 'execute-api'
            }
          ]
        }
      };
      
      // Update AWS config
      await updateConfig(newConfig);
      
      // Save to storage (optional)
      await saveAWSConfig(newConfig);
      
      Alert.alert('Success', 'AWS configuration saved successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save AWS configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Refresh credentials
  const handleRefresh = async () => {
    try {
      await refreshCredentials();
      Alert.alert('Success', 'AWS credentials refreshed successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to refresh AWS credentials');
    }
  };

  // Toggle region selector
  const toggleRegionSelector = () => {
    setShowRegionSelector(!showRegionSelector);
  };

  // Select a region
  const selectRegion = (selectedRegion) => {
    setRegion(selectedRegion);
    setShowRegionSelector(false);
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading AWS configuration..." fullScreen={true} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>AWS Authentication</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cognito Identity Pool ID</Text>
            <TextInput
              style={styles.input}
              value={identityPoolId}
              onChangeText={setIdentityPoolId}
              placeholder="us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>AWS Region</Text>
            <TouchableOpacity 
              style={styles.regionSelector}
              onPress={toggleRegionSelector}
            >
              <Text style={styles.regionText}>
                {formatRegionName(region)} ({region})
              </Text>
            </TouchableOpacity>
            
            {showRegionSelector && (
              <View style={styles.regionList}>
                {AWS_REGIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.regionItem, region === r && styles.selectedRegionItem]}
                    onPress={() => selectRegion(r)}
                  >
                    <Text style={[styles.regionItemText, region === r && styles.selectedRegionItemText]}>
                      {formatRegionName(r)} ({r})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Name</Text>
            <TextInput
              style={styles.input}
              value={apiName}
              onChangeText={setApiName}
              placeholder="ImageGeneratorAPI"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Gateway Endpoint</Text>
            <TextInput
              style={styles.input}
              value={apiEndpoint}
              onChangeText={setApiEndpoint}
              placeholder="https://xxxxxxxxxx.execute-api.region.amazonaws.com/stage"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              The full URL of your API Gateway endpoint
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <LoadingIndicator message="Saving..." />
            ) : (
              <Text style={styles.buttonText}>Save Configuration</Text>
            )}
          </TouchableOpacity>
          
          {isConfigured && (
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleRefresh}
            >
              <Text style={styles.buttonText}>Refresh Credentials</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  regionSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  regionText: {
    fontSize: 16,
  },
  regionList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  regionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedRegionItem: {
    backgroundColor: '#e6f2ff',
  },
  regionItemText: {
    fontSize: 14,
  },
  selectedRegionItemText: {
    color: '#007bff',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen; 