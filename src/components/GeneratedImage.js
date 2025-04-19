import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { saveImageToGallery, shareImage } from '../utils/imageUtils';
import { formatImageSize } from '../utils/imageUtils';

const GeneratedImage = ({ imageData, onClear }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [imageError, setImageError] = useState(null);
  const windowDimensions = useWindowDimensions();
  
  // 画像データが存在するか確認
  if (!imageData || !imageData.imageData) {
    console.warn('Invalid image data provided to GeneratedImage component');
    return null;
  }

  // デバッグ目的でイメージデータの情報をログに出力
  useEffect(() => {
    if (imageData && imageData.imageData) {
      console.log('Image data received:', {
        id: imageData.id,
        prompt: imageData.prompt?.substring(0, 20) + '...',
        hasImageData: !!imageData.imageData,
        dataLength: typeof imageData.imageData === 'string' ? imageData.imageData.length : 'unknown'
      });
    }
  }, [imageData]);

  // Calculate optimal image display size based on screen dimensions and aspect ratio
  const calculateImageDisplaySize = () => {
    // Get image dimensions from size parameter
    const [width, height] = imageData.parameters.size.split('x').map(Number);
    const aspectRatio = width / height;
    
    const maxWidth = windowDimensions.width * 0.9;
    const maxHeight = windowDimensions.height * 0.6;
    
    let displayWidth = maxWidth;
    let displayHeight = displayWidth / aspectRatio;
    
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = maxHeight * aspectRatio;
    }
    
    return {
      width: displayWidth,
      height: displayHeight,
    };
  };
  
  const { width: imageWidth, height: imageHeight } = calculateImageDisplaySize();

  // Handle image save to gallery
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const filename = `ai-${imageData.id || Date.now()}`;
      await saveImageToGallery(imageData.imageData, filename);
      
      Alert.alert('Success', 'Image saved to gallery');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', error.message || 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image sharing
  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      const filename = `ai-${imageData.id || Date.now()}`;
      await shareImage(imageData.imageData, filename);
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', error.message || 'Failed to share image');
    } finally {
      setIsSharing(false);
    }
  };

  // Check if image data starts with base64 prefix, if not, add it
  const getImageSource = () => {
    try {
      // base64文字列のバリデーションと前処理
      let base64Data = imageData.imageData;

      // データが文字列でない場合は文字列に変換
      if (typeof base64Data !== 'string') {
        console.warn('Image data is not a string, converting to string');
        base64Data = String(base64Data);
      }

      // 不要な引用符を削除
      base64Data = base64Data.replace(/^["']|["']$/g, '');

      // すでにdata:URLの場合はそのまま使用
      if (base64Data.startsWith('data:')) {
        return { uri: base64Data };
      }
      
      // MIME typeを自動検出（単純な実装）
      let mimeType = 'image/png';
      if (base64Data.length > 10) {
        // JPEGのマジックナンバーをチェック（シンプルな実装）
        const firstChars = base64Data.substring(0, 10);
        if (firstChars.includes('/9j/')) {
          mimeType = 'image/jpeg';
        }
      }
      
      // 適切なdata:URLを構築
      return { uri: `data:${mimeType};base64,${base64Data}` };
    } catch (error) {
      console.error('Error processing image data:', error);
      setImageError('Failed to process image data');
      // エラー時はダミー画像を返す
      return { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2Q3TcHwAAAABJRU5ErkJggg==' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={[styles.errorContainer, { width: imageWidth, height: imageHeight }]}>
            <Text style={styles.errorText}>{imageError}</Text>
            <Text style={styles.errorDescription}>There was a problem displaying the image.</Text>
          </View>
        ) : (
          <Image
            source={getImageSource()}
            style={[styles.image, { width: imageWidth, height: imageHeight }]}
            resizeMode="contain"
            onError={(e) => {
              console.error('Image loading error:', e.nativeEvent.error);
              setImageError('Failed to load image');
            }}
          />
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.promptText} numberOfLines={2} ellipsizeMode="tail">
          {imageData.prompt}
        </Text>
        <Text style={styles.infoText}>
          Style: {imageData.parameters.style}
        </Text>
        <Text style={styles.infoText}>
          Size: {formatImageSize(imageData.parameters.size)}
        </Text>
        <Text style={styles.infoText}>
          Seed: {imageData.parameters.seed}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleSave}
          disabled={isSaving || imageError}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Save to Gallery</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleShare}
          disabled={isSharing || imageError}
        >
          {isSharing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Share</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]}
          onPress={onClear}
        >
          <Text style={styles.buttonText}>New Image</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  imageContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    borderRadius: 8,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#721c24',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  errorDescription: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    color: '#555',
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default GeneratedImage; 