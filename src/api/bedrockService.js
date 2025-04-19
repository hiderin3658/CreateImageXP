import { Amplify, API, Auth } from 'aws-amplify';
import awsConfig from '../config/aws-config';
import { callAPI, getCurrentCredentials } from './aws';

/**
 * Generate an image using AWS Bedrock Nova Canvas model via API Gateway/Lambda
 * @param {Object} params - Image generation parameters
 * @param {string} params.prompt - Text prompt for image generation
 * @param {string} params.style - Style preset (e.g., 'photographic', 'cinematic', etc.)
 * @param {number} params.cfgScale - CFG scale parameter (typically 1-20)
 * @param {number} params.steps - Number of steps for generation (typically 10-50)
 * @param {string} params.size - Image size (e.g., '512x512', '1024x1024')
 * @param {number} params.seed - Optional seed for reproducibility
 * @returns {Promise<Object>} - Generated image data (base64) and metadata
 */
export async function generateImage(prompt, options = {}) {
  console.log('Generating image with prompt:', prompt);
  
  try {
    // APIの設定情報を確認
    console.log('AWS Config:', {
      region: awsConfig.region,
      api: {
        endpoints: awsConfig.API.endpoints.map(ep => ({
          name: ep.name,
          endpoint: ep.endpoint,
          authType: ep.authorizationType || 'Unknown'
        }))
      }
    });
    
    // AWS認証情報を取得
    console.log('Getting AWS credentials...');
    let credentials;
    try {
      credentials = await getCurrentCredentials();
      console.log('AWS credentials obtained:', {
        authenticated: credentials.authenticated,
        identityId: credentials.identityId ? 'Available' : 'Not available',
        hasAccessKey: !!credentials.accessKeyId,
        expired: credentials.expiration ? new Date() > new Date(credentials.expiration) : false
      });
    } catch (credError) {
      console.warn('Failed to get AWS credentials, using unauthenticated access:', credError);
    }

    // スタイル名のマッピング
    const styleMapping = {
      'neon': 'neon-punk',  // UIのneonをAPIのneon-punkに変換
    };

    // 選択されたスタイル
    const selectedStyle = options.style || 'photographic';
    
    // Nova Canvasの仕様に合わせてスタイル名を変換
    const mappedStyle = styleMapping[selectedStyle] || selectedStyle;
    
    console.log('Style mapping:', { 
      selected: selectedStyle, 
      mapped: mappedStyle,
      isMapped: selectedStyle !== mappedStyle 
    });

    // AWSManager.swift と同じパラメータ名を使用
    const payload = {
      prompt: prompt,
      style: mappedStyle,
      style_preset: mappedStyle,
      cfgScale: options.cfgScale || 6.5,
      steps: options.steps || 30,
      numberOfImages: 1
    };
    
    // サイズパラメータを幅と高さに分割
    if (options.size) {
      const [width, height] = options.size.split('x').map(Number);
      payload.width = width;
      payload.height = height;
    } else {
      payload.width = 1024;
      payload.height = 1024;
    }
    
    // seedパラメータを設定（0を指定するとランダムシードが使用される）
    payload.seed = options.seed || 0;
    
    console.log('API Request Payload:', JSON.stringify(payload));
    
    // API名とAPIパスを設定ファイルから取得
    const apiName = 'ImageGeneratorAPI';
    const apiEndpointConfig = awsConfig.API.endpoints.find(ep => ep.name === apiName);
    
    if (!apiEndpointConfig) {
      throw new Error(`API endpoint configuration not found for ${apiName}`);
    }
    
    // 設定ファイルからパスを取得
    const apiPath = apiEndpointConfig.paths?.generateImage;
    
    if (!apiPath) {
      throw new Error('generateImage path not configured in AWS config');
    }
    
    console.log('Using API path from config:', apiPath);
    
    // APIリクエストを実行
    let response;
    try {
      // aws-config.jsの設定を使用し、APIGatewayへのリクエストを送信
      // Amplify APIを使用してSigV4署名を適用
      console.log('Calling API with AWS SigV4 auth...');

      // SigV4署名が適用されるAmplify APIを使用
      response = await API.post(apiName, apiPath, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('API call successful with SigV4 auth');
    } catch (apiError) {
      console.error('SigV4 API call failed:', apiError);
      
      // フォールバック：直接APIを呼び出し
      console.log('Attempting direct API call as fallback...');
      
      // 設定ファイルからエンドポイントを取得
      const apiEndpoint = apiEndpointConfig.endpoint;
      
      // 完全なURLを構築（パスの先頭に/がある場合は除去しない）
      const fullUrl = `${apiEndpoint}${apiPath}`;
      console.log('Calling API URL directly:', fullUrl);
      
      // 認証情報を使用
      const accessInfo = {
        access_key: credentials?.accessKeyId,
        secret_key: credentials?.secretAccessKey,
        session_token: credentials?.sessionToken
      };
      
      // 直接fetchを使用してリクエスト (最後の手段として)
      const fetchResponse = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessInfo.session_token ? {'X-Amz-Security-Token': accessInfo.session_token} : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('API request failed:', {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          body: errorText
        });
        throw new Error(`API request failed with status code ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }
      
      // レスポンスをJSON形式でパース
      response = await fetchResponse.json();
      console.log('API call successful via direct fetch');
    }
    
    console.log('API Response received:', {
      success: !!response,
      hasData: !!response,
      dataKeys: response ? Object.keys(response) : []
    });
    
    // AWSManager.swiftの処理に基づくレスポンス処理
    if (response && response.images && response.images.length > 0) {
      // Lambda関数の直接レスポンス形式
      return {
        success: true,
        imageData: response.images[0],
        metadata: {
          prompt: response.prompt || prompt,
          originalPrompt: response.originalPrompt,
          translatedPrompt: response.translatedPrompt,
          ...options
        }
      };
    } else if (response && response.body) {
      // API Gateway統合レスポンス形式
      let bodyData;
      try {
        bodyData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
      } catch (e) {
        console.error('Error parsing body data:', e);
        throw new Error('Invalid response body format');
      }
      
      if (bodyData.images && bodyData.images.length > 0) {
        return {
          success: true,
          imageData: bodyData.images[0],
          metadata: {
            prompt: bodyData.prompt || prompt,
            originalPrompt: bodyData.originalPrompt,
            translatedPrompt: bodyData.translatedPrompt,
            ...options
          }
        };
      } else {
        console.error('No images in body data:', bodyData);
        throw new Error('No images found in API response body');
      }
    }
    
    // レスポンスデータをより詳細に調査
    console.error('API response structure does not match expected format:', JSON.stringify(response, null, 2));
    throw new Error('API response does not contain expected image data');
  } catch (error) {
    // API呼び出しエラーの詳細なログ
    console.error('Image generation failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    
    throw new Error(`Image generation failed: ${error.message}`);
  }
}

/**
 * Available style presets for Nova Canvas model
 */
export const STYLE_PRESETS = [
  { id: 'photographic', name: 'Photographic', description: 'Realistic photographic style' },
  { id: 'cinematic', name: 'Cinematic', description: 'Movie-like visual style' },
  { id: 'digital-art', name: 'Digital Art', description: 'Digital artwork style' },
  { id: 'cartoon', name: 'Cartoon', description: 'Animated cartoon style' },
  { id: 'painting', name: 'Painting', description: 'Traditional painting style' },
  { id: '3d-model', name: '3D Model', description: 'Three-dimensional rendered model' },
  { id: 'pixel-art', name: 'Pixel Art', description: 'Retro pixel art style' },
  { id: 'comic-book', name: 'Comic Book', description: 'Comic book illustration style' },
  { id: 'fantasy-art', name: 'Fantasy Art', description: 'Fantasy themed artwork' },
  { id: 'neon', name: 'Neon', description: 'Bright neon illuminated style' },
  { id: 'isometric', name: 'Isometric', description: 'Isometric design view' },
];

/**
 * Available size options for Nova Canvas model
 */
export const SIZE_OPTIONS = [
  { id: '512x512', name: '512 × 512' },
  { id: '512x768', name: '512 × 768' },
  { id: '768x512', name: '768 × 512' },
  { id: '768x768', name: '768 × 768' },
  { id: '1024x1024', name: '1024 × 1024' },
]; 