import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView, 
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import StylePresetSelector from './StylePresetSelector';
import ParameterSlider from './ParameterSlider';
import { STYLE_PRESETS } from '../api/bedrockService';

const ImageGeneratorForm = ({ 
  parameters, 
  onUpdateParameters, 
  onGenerate, 
  isGenerating,
  onGenerateRandomSeed 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle form submission
  const handleSubmit = () => {
    onGenerate();
  };

  // Toggle advanced options visibility
  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prompt input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Prompt</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="Describe the image you want to generate..."
            value={parameters.prompt}
            onChangeText={(text) => onUpdateParameters({ prompt: text })}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />
        </View>

        {/* Style preset selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.label}>Style</Text>
          <StylePresetSelector
            presets={STYLE_PRESETS}
            selectedStyle={parameters.style}
            onSelectStyle={(style) => onUpdateParameters({ style })}
          />
        </View>

        {/* Advanced options toggle */}
        <TouchableOpacity style={styles.advancedToggle} onPress={toggleAdvanced}>
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </Text>
        </TouchableOpacity>

        {/* Advanced options */}
        {showAdvanced && (
          <View style={styles.advancedContainer}>
            {/* CFG Scale slider */}
            <ParameterSlider
              label="CFG Scale"
              value={parameters.cfgScale}
              onValueChange={(value) => onUpdateParameters({ cfgScale: value })}
              minimumValue={1}
              maximumValue={20}
              step={0.5}
              minimumLabel="1"
              maximumLabel="20"
              description="Controls how closely the image follows your prompt"
            />

            {/* Steps slider */}
            <ParameterSlider
              label="Steps"
              value={parameters.steps}
              onValueChange={(value) => onUpdateParameters({ steps: value })}
              minimumValue={10}
              maximumValue={50}
              step={1}
              minimumLabel="10"
              maximumLabel="50"
              description="More steps can improve details but takes longer"
            />

            {/* Seed input */}
            <View style={styles.seedContainer}>
              <Text style={styles.label}>Seed</Text>
              <View style={styles.seedInputContainer}>
                <TextInput
                  style={styles.seedInput}
                  value={parameters.seed.toString()}
                  onChangeText={(text) => {
                    const numValue = parseInt(text.replace(/[^0-9]/g, ''));
                    if (!isNaN(numValue)) {
                      onUpdateParameters({ seed: numValue });
                    } else if (text === '') {
                      onUpdateParameters({ seed: 0 });
                    }
                  }}
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={styles.randomSeedButton}
                  onPress={onGenerateRandomSeed}
                >
                  <Text style={styles.randomSeedButtonText}>Random</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.parameterDescription}>
                Same seed and parameters produce similar results
              </Text>
            </View>
          </View>
        )}

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generatingButton]}
          onPress={handleSubmit}
          disabled={isGenerating || !parameters.prompt}
        >
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  inputContainer: {
    marginVertical: 10,
  },
  sectionContainer: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  advancedToggle: {
    alignItems: 'center',
    marginVertical: 16,
  },
  advancedToggleText: {
    color: '#007bff',
    fontSize: 16,
  },
  advancedContainer: {
    marginBottom: 16,
  },
  seedContainer: {
    marginVertical: 10,
  },
  seedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  randomSeedButton: {
    marginLeft: 8,
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  randomSeedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  parameterDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  generateButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  generatingButton: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ImageGeneratorForm; 