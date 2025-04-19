/**
 * AWS Configuration Sample File for the Image Generator App
 * 
 * Instructions:
 * 1. Copy this file to aws-config.js
 * 2. Replace the placeholder values with your actual AWS configuration
 * 3. Make sure aws-config.js is added to .gitignore to avoid committing your credentials
 */

const awsConfig = {
  // AWS Region (e.g., 'us-east-1', 'us-west-2', etc.)
  region: 'REGION',
  
  // Cognito Identity Pool configuration for Amplify v5
  Auth: {
    // REQUIRED - Amazon Cognito Identity Pool ID
    identityPoolId: 'REGION:IDENTITY_POOL_ID',
    // REQUIRED - Amazon Cognito Region
    region: 'REGION',
    // OPTIONAL - Amazon Cognito User Pool ID
    // userPoolId: 'XX-XXXX-X_abcd1234', 
    // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
    // userPoolWebClientId: 'a1b2c3d4e5f6g7h8i9j0k1l2m3',
    // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
    mandatorySignIn: false,
    // OPTIONAL - Configuration for cookie storage
    cookieStorage: {
      // REQUIRED - Cookie domain (only required if cookieStorage is provided)
      domain: 'localhost',
      // OPTIONAL - Cookie path
      path: '/',
      // OPTIONAL - Cookie expiration in days
      expires: 365,
      // OPTIONAL - See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
      sameSite: 'strict',
      // OPTIONAL - Cookie secure flag
      secure: false
    }
  },
  
  // API Gateway configuration
  API: {
    endpoints: [
      {
        name: 'ImageGeneratorAPI',
        // API GatewayのエンドポイントURL
        endpoint: 'https://API_ID.execute-api.REGION.amazonaws.com',
        // API認証タイプ - AWS_IAMを使用してSigV4認証を有効に
        authorizationType: 'AWS_IAM',
        // APIのリージョンを指定
        region: 'REGION',
        // APIパス設定
        paths: {
          // 画像生成エンドポイントのパス（大文字のIを使用）
          generateImage: '/STAGE/generateImage'
        },
        // カスタムヘッダー設定（必要に応じて）
        custom_header: function() {
          return {};
        }
      }
    ]
  },
  
  // Bedrock configuration
  Bedrock: {
    region: 'REGION',
    modelId: 'MODEL_ID', // e.g. 'amazon.nova-canvas-v1:0' or 'amazon.nova-canvas-v1'
  }
};

export default awsConfig; 