import { useState, useCallback } from 'react';
import { generateImage } from '../api/bedrockService';
import { saveGeneratedImage } from '../utils/imageUtils';

/**
 * Hook for handling image generation functionality
 * @returns {Object} - Image generation state and functions
 */
const useImageGeneration = () => {
  // State for generated images and loading
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Default parameters for image generation
  const [parameters, setParameters] = useState({
    prompt: '',
    style: 'photographic',
    size: '1024x1024', // 固定サイズ
    cfgScale: 6.5,
    steps: 30,
    seed: Math.floor(Math.random() * 1000000),
  });
  
  // Update parameters with partial changes
  const updateParameters = useCallback((newParams) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  }, []);
  
  // Generate random seed
  const generateRandomSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 1000000);
    updateParameters({ seed: newSeed });
  }, [updateParameters]);
  
  // Generate image with current parameters
  const generateWithCurrentParams = useCallback(async () => {
    if (!parameters.prompt) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log('Starting image generation with parameters:', parameters);
      
      // 固定サイズを使用
      const options = {
        style: parameters.style,
        cfgScale: parameters.cfgScale,
        steps: parameters.steps,
        size: '1024x1024',
        seed: parameters.seed || 0,
      };
      
      // Call API to generate image
      const result = await generateImage(parameters.prompt, options);
      
      console.log('Image generation successful:', {
        success: result.success,
        hasImageData: !!result.imageData,
      });
      
      if (result.success && result.imageData) {
        // Process result
        const generatedImageData = {
          id: Date.now().toString(),
          prompt: parameters.prompt,
          imageData: result.imageData,
          timestamp: new Date().toISOString(),
          parameters: {
            style: parameters.style,
            size: '1024x1024',
            cfgScale: parameters.cfgScale,
            steps: parameters.steps,
            seed: parameters.seed,
          },
          metadata: result.metadata,
        };
        
        // Update state with new image
        setGeneratedImage(generatedImageData);
        
        // 自動保存を削除
        // 保存は GeneratedImage コンポーネントの Save ボタンから行う
      } else {
        throw new Error('Failed to generate image. No image data received.');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setError(`Failed to generate image: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [parameters]);
  
  // 手動で画像を保存する関数
  const saveCurrentImage = useCallback(async () => {
    if (!generatedImage) {
      return { success: false, error: 'No image to save' };
    }
    
    try {
      const savedImage = await saveGeneratedImage(generatedImage);
      return { success: true, savedImage };
    } catch (err) {
      console.error('Error saving image:', err);
      return { success: false, error: err.message };
    }
  }, [generatedImage]);
  
  return {
    generatedImage,
    isGenerating,
    error,
    parameters,
    updateParameters,
    generateRandomSeed,
    generateImage: generateWithCurrentParams,
    saveImage: saveCurrentImage, // 手動保存用の関数を追加
    resetImage: () => setGeneratedImage(null),
  };
};

export default useImageGeneration; 