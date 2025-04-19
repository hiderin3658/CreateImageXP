import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * 文字列が有効なbase64形式かチェックする
 * @param {string} str - チェックする文字列
 * @returns {boolean} - 有効なbase64形式ならtrue
 */
const isValidBase64 = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  // base64はA-Z, a-z, 0-9, +, /, =（パディング用）で構成される
  // data:URLプレフィックスは除外する
  const base64Content = str.startsWith('data:') 
    ? str.split(',')[1] 
    : str;
    
  const regex = /^[A-Za-z0-9+/=]+$/;
  return regex.test(base64Content);
};

/**
 * base64データを標準化して完全なdata:URLを返す
 * @param {string} base64Data - 元のbase64データ
 * @returns {string} - 標準化されたdata:URL
 */
const normalizeBase64Data = (base64Data) => {
  if (!base64Data) return null;
  
  // 文字列に変換
  let data = typeof base64Data === 'string' ? base64Data : String(base64Data);
  
  // 引用符を削除
  data = data.replace(/^["']|["']$/g, '');
  
  // すでにdata:URLの場合はそのまま返す
  if (data.startsWith('data:')) {
    return data;
  }
  
  // MIME typeを推測（簡易実装）
  let mimeType = 'image/png';
  if (data.length > 10) {
    const firstChars = data.substring(0, 10);
    if (firstChars.includes('/9j/')) {
      mimeType = 'image/jpeg';
    }
  }
  
  // data:URLを構築
  return `data:${mimeType};base64,${data}`;
};

/**
 * Save generated image data to device
 * @param {Object} generatedImageData - Generated image data object
 * @returns {Promise<Object>} - Result of save operation
 */
export const saveGeneratedImage = async (generatedImageData) => {
  try {
    if (!generatedImageData || !generatedImageData.imageData) {
      throw new Error('No image data provided');
    }

    // 画像データを取得
    const { imageData, prompt, timestamp, id } = generatedImageData;
    
    // ファイル名を生成（プロンプトの最初の10文字とタイムスタンプを使用）
    const sanitizedPrompt = (prompt || 'image')
      .replace(/[^a-z0-9]/gi, '-')
      .substring(0, 10);
    const filename = `ai-${sanitizedPrompt}-${id || Date.now()}`;
    
    console.log(`Saving generated image: ${filename}`);
    
    // ギャラリーに保存
    const result = await saveImageToGallery(imageData, filename);
    
    // 保存に成功した場合は、generatedImageDataに保存情報を追加
    return {
      ...generatedImageData,
      saved: true,
      savedAt: new Date().toISOString(),
      assetId: result.asset?.id
    };
  } catch (error) {
    console.error('Error saving generated image:', error);
    throw error;
  }
};

/**
 * Save a base64 image to the device's photo gallery
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} filename - Desired filename
 * @returns {Promise<Object>} - Result of save operation
 */
export const saveImageToGallery = async (base64Image, filename = 'generated-image') => {
  try {
    // Request permissions if needed
    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    // base64データを標準化
    const normalizedData = normalizeBase64Data(base64Image);
    if (!normalizedData) {
      throw new Error('Invalid base64 image data');
    }
    
    console.log('Saving image, data length:', normalizedData.length);

    // Create a temp file from base64 data
    const fileUri = `${FileSystem.cacheDirectory}${filename}.png`;
    
    try {
      await FileSystem.writeAsStringAsync(fileUri, normalizedData, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (writeError) {
      console.error('Error writing file:', writeError);
      throw new Error('Failed to create temporary image file');
    }

    // Save to media library
    const asset = await MediaLibrary.createAssetAsync(fileUri);
    
    // Create album if needed and add asset to it
    const album = await MediaLibrary.getAlbumAsync('AI Generated Images');
    if (album === null) {
      await MediaLibrary.createAlbumAsync('AI Generated Images', asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }

    // Delete temp file
    await FileSystem.deleteAsync(fileUri, { idempotent: true });

    return {
      success: true,
      asset
    };
  } catch (error) {
    console.error('Error saving image to gallery:', error);
    throw error;
  }
};

/**
 * Share a base64 image
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} filename - Desired filename
 * @returns {Promise<void>}
 */
export const shareImage = async (base64Image, filename = 'generated-image') => {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    // base64データを標準化
    const normalizedData = normalizeBase64Data(base64Image);
    if (!normalizedData) {
      throw new Error('Invalid base64 image data');
    }
    
    console.log('Sharing image, data length:', normalizedData.length);

    // Create a temp file from base64 data
    const fileUri = `${FileSystem.cacheDirectory}${filename}.png`;
    
    try {
      await FileSystem.writeAsStringAsync(fileUri, normalizedData, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (writeError) {
      console.error('Error writing file for sharing:', writeError);
      throw new Error('Failed to create temporary image file for sharing');
    }

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Generated Image',
    });

    // Delete temp file after sharing
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.error('Error sharing image:', error);
    throw error;
  }
};

/**
 * Format image size string for display
 * @param {string} sizeStr - Size string (e.g., '512x512')
 * @returns {string} - Formatted size string
 */
export const formatImageSize = (sizeStr) => {
  if (!sizeStr) return '';
  
  const [width, height] = sizeStr.split('x');
  return `${width} × ${height}`;
}; 