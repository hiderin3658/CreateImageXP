import json
import boto3
import os
import base64
import logging

# バージョン識別子
VERSION = "v1.2.0 - 2025-04-19"

# ロギングの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    # 最初に必ずバージョンをログ出力
    logger.info(f"====== Lambda Function Version: {VERSION} ======")
    logger.info(f"====== FUNCTION EXECUTION START ======")
    
    # ログ出力を追加
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # リクエストボディの取得
        if 'body' in event:
            # プロキシ統合の場合、bodyはJSON文字列
            try:
                body = json.loads(event['body'])
                logger.info(f"Parsed body from event['body']: {json.dumps(body)}")
            except Exception as e:
                logger.error(f"Error parsing body: {str(e)}")
                if isinstance(event['body'], dict):
                    body = event['body']  # すでにJSONオブジェクトの場合
                else:
                    logger.error("Invalid body format in event")
                    return {
                        "statusCode": 400,
                        "headers": {"Content-Type": "application/json"},
                        "body": json.dumps({"error": "リクエストボディのフォーマットが無効です。"})
                    }
        else:
            # 非プロキシ統合または直接イベントにパラメータがある場合
            body = event
            logger.info(f"Using entire event as body: {json.dumps(event)}")
        
        # 必要なパラメータの取得
        prompt = body.get('prompt')
        
        # Promptがない場合はエラー
        if not prompt:
            error_response = {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "リクエストボディが見つかりません。"})
            }
            logger.error("Missing prompt in request")
            return error_response
        
        # その他のパラメータを取得
        number_of_images = body.get('numberOfImages', 1)
        width = body.get('width', 1024)
        height = body.get('height', 1024)
        cfg_scale = body.get('cfgScale', 7.0)
        seed = body.get('seed', 0)
        steps = body.get('steps', 50)
        
        # styleとstyle_presetの両方をサポート
        style_preset = body.get('style_preset', '')
        # styleパラメータが存在すれば、それを優先して使用
        if not style_preset and 'style' in body:
            style_preset = body.get('style', '')
            logger.info(f"Using 'style' parameter instead of 'style_preset': {style_preset}")
        
        logger.info(f"Parameters: prompt={prompt}, style_preset={style_preset}, numberOfImages={number_of_images}, width={width}, height={height}, cfgScale={cfg_scale}, seed={seed}, steps={steps}")
        
        # オリジナルプロンプトを保存
        original_prompt = prompt
        
        # 日本語プロンプトを検出して英語に翻訳
        translate_client = boto3.client('translate')
        
        # 日本語文字が含まれているか簡易チェック
        has_japanese = any(ord(c) > 0x3000 for c in prompt)
        
        if has_japanese:
            try:
                # AWS Translateを使用して翻訳
                translation_response = translate_client.translate_text(
                    Text=prompt,
                    SourceLanguageCode='ja',
                    TargetLanguageCode='en'
                )
                
                # 翻訳結果を取得
                prompt = translation_response.get('TranslatedText')
                
                logger.info(f"Translated prompt: '{original_prompt}' -> '{prompt}'")
            except Exception as e:
                logger.warning(f"Translation failed: {str(e)}, using original prompt")
        
        # Nova Canvasに最適化したプロンプトに拡張
        # スタイルプリセットがある場合は適用
        logger.info(f"【重要】スタイル適用前のプロンプト: '{prompt}'")
        logger.info(f"【重要】適用するスタイル: '{style_preset}'")
        enhanced_prompt = enhance_prompt_for_nova_canvas(prompt, style_preset)
        logger.info(f"【重要】スタイル適用後の拡張プロンプト: '{enhanced_prompt}'")
        
        # Bedrock クライアント
        bedrock_runtime = boto3.client(
            service_name='bedrock-runtime',
            region_name=os.environ.get('BEDROCK_REGION', 'ap-northeast-1')  # 環境変数から取得、デフォルト値も設定
        )
        
        # モデルID
        model_id = os.environ.get('BEDROCK_MODEL_ID', 'amazon.nova-canvas-v1:0')
        
        # Bedrock API リクエスト（Nova Canvas正しい形式）
        request_body = {
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {
                "text": enhanced_prompt
            },
            "imageGenerationConfig": {
                "seed": seed,
                "quality": "standard",
                "width": width,
                "height": height,
                "numberOfImages": number_of_images,
                "cfgScale": cfg_scale  # Nova Canvasに直接cfgScaleパラメータを追加
            }
        }
        
        logger.info(f"【重要】Bedrock Nova Canvas API リクエスト: {json.dumps(request_body)}")
        
        # Bedrock API 呼び出し
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(request_body)
        )
        
        # レスポンスの解析
        response_body = json.loads(response['body'].read())
        logger.info(f"Bedrock response: {json.dumps(response_body)}")
        
        # Base64 エンコードされた画像データの取得
        images = []
        if 'images' in response_body:
            images = response_body['images']
            logger.info(f"【重要】Nova Canvas画像生成完了: {len(images)}枚の画像")
        elif 'content' in response_body:
            # Claude形式のレスポンス処理
            for item in response_body.get('content', []):
                if item.get('type') == 'image' and 'source' in item:
                    if 'data' in item['source'] and 'base64' in item['source']['data']:
                        images.append(item['source']['data']['base64'])
            logger.info(f"【重要】Claude形式レスポンスから画像取得: {len(images)}枚の画像")
        
        # デバッグ情報を追加
        debug_info = {
            "version": VERSION,
            "original_prompt": original_prompt,
            "translated_prompt": prompt if has_japanese else original_prompt,
            "enhanced_prompt": enhanced_prompt,
            "style": style_preset,
            "cfg_scale": cfg_scale,
            "steps": steps,
            "seed": seed
        }
        logger.info(f"【重要】デバッグ情報: {json.dumps(debug_info)}")
        
        # 成功レスポンス
        success_response = {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "images": images, 
                "prompt": enhanced_prompt,
                "originalPrompt": original_prompt,
                "translatedPrompt": prompt if has_japanese else "",
                "style": style_preset,  # スタイル情報も返す
                "debug": debug_info,    # デバッグ情報も返す
                "version": VERSION      # バージョン情報も返す
            })
        }
        
        logger.info(f"====== FUNCTION EXECUTION END ======")
        return success_response
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        # エラーレスポンス
        error_response = {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "error": str(e),
                "version": VERSION  # エラー時もバージョン情報を返す
            })
        }
        logger.info(f"====== FUNCTION EXECUTION ERROR ======")
        return error_response

def enhance_prompt_for_nova_canvas(prompt, style_preset=""):
    """
    プロンプトをNova Canvasに最適化して拡張する
    より詳細なスタイル拡張を提供
    """
    # プロンプトの基本構造: 主題 + 詳細 + スタイル + 品質
    base_prompt = prompt.strip()
    
    # スタイルプリセットに基づく拡張
    # Nova Canvasの公式スタイルプリセットに対応するテンプレート
    style_templates = {
        "photographic": "THIS IS A PHOTOGRAPH, NOT DIGITAL ART, highly detailed professional photograph, sharp focus, high resolution, realistic lighting, photorealistic, DSLR, 4K UHD, professional photography",
        "cinematic": "THIS IS A CINEMATIC SCENE, NOT DIGITAL ART, cinematic shot, movie scene, film photography, dramatic lighting, cinematic composition, film grain, professional cinematography",
        "digital-art": "THIS IS DIGITAL ART, NOT A PHOTOGRAPH, detailed digital illustration, vibrant colors, fantasy concept art, professional digital painting, highly detailed, created digitally",
        "cartoon": "THIS IS A CARTOON, NOT A PHOTOGRAPH, cartoon style, animated, colorful, stylized, simple shapes, clean lines, family-friendly animation, 2D cartoon",
        "painting": "THIS IS A PAINTING, NOT A PHOTOGRAPH, painting style, oil painting, acrylic, detailed brushstrokes, artistic, canvas texture, traditional art technique, painted by an artist",
        "3d-model": "THIS IS A 3D RENDER, NOT A PHOTOGRAPH, 3D model, computer graphics, detailed textures, ray tracing, subsurface scattering, physically based rendering, 3D modeling software, digital sculpture",
        "pixel-art": "THIS IS PIXEL ART, NOT A PHOTOGRAPH, 8-bit graphics, limited color palette, blocky pixels, retro gaming aesthetic, pixelated, individual visible pixels", 
        "comic-book": "THIS IS A COMIC BOOK ILLUSTRATION, NOT A PHOTOGRAPH, comic book style, ink lines, bold colors, comic panel, illustration, graphic novel art, comic art",
        "fantasy-art": "THIS IS FANTASY ART, NOT A PHOTOGRAPH, magical, mystical, ethereal, detailed fantasy illustration, imaginative scene, fantasy world",
        "neon-punk": "THIS IS NEON CYBERPUNK ART, NOT A PHOTOGRAPH, vibrant neon colors, futuristic, glowing elements, high contrast, cyber aesthetic, dystopian future, synthetic world",
        "isometric": "THIS IS ISOMETRIC ART, NOT A PHOTOGRAPH, isometric view, isometric design, geometric, precise angles, clean lines, technical illustration, game asset style, 3/4 view"
    }
    
    # その他のスタイルプリセット（旧バージョンとの互換性維持）
    additional_styles = {
        "line art": "THIS IS LINE ART, line art style, clean linework, high contrast black and white illustration, minimalist, pen and ink, NOT a photograph",
        "watercolor": "THIS IS A WATERCOLOR PAINTING, watercolor painting style, soft colors, gentle brush strokes, artistic, water-based media, flowing pigments, NOT a photograph",
        "oil painting": "THIS IS AN OIL PAINTING, oil painting style, textured brush strokes, rich colors, classic art technique, impasto, fine art, NOT a photograph",
        "3d rendering": "THIS IS A 3D RENDER, 3D rendering, detailed textures, volumetric lighting, professional 3D visualization, CGI, blender style, NOT a photograph",
        "anime": "THIS IS ANIME ART, anime style, Japanese animation, vibrant colors, clean lines, detailed characters and backgrounds, NOT a photograph",
    }
    
    # すべてのスタイルテンプレートを結合
    all_styles = {**style_templates, **additional_styles}
    
    # スタイル記述を取得（大文字小文字を区別しない）
    style_description = ""
    style_key = style_preset.lower() if style_preset else ""
    
    logger.info(f"DEBUG: Style key is '{style_key}'")
    
    # 正確なキーマッチング
    if style_key in all_styles:
        style_description = all_styles[style_key]
        logger.info(f"DEBUG: Exact match found for style '{style_key}'")
    # 部分一致も検索
    else:
        for key, desc in all_styles.items():
            if key in style_key or style_key in key:
                style_description = desc
                logger.info(f"DEBUG: Partial match found: '{key}' for style '{style_key}'")
                break
        # どれにも一致しない場合は単純にスタイル名を使用
        if not style_description and style_key:
            style_description = f"THIS IS IN {style_preset.upper()} STYLE, highly detailed {style_preset} style"
            logger.info(f"DEBUG: No match found, using generic style description for '{style_key}'")
    
    # スタイルの表現が既にプロンプトに含まれていないか確認
    style_already_in_prompt = False
    if style_description:
        style_keywords = style_description.split(', ')
        style_already_in_prompt = any(keyword.lower() in base_prompt.lower() for keyword in style_keywords)
    
    # 品質とレンダリングに関する詳細を追加
    quality_description = "high quality, 4K, detailed, professional"
    
    # スタイル名を日本語とローマ字の両方で強調するための追加文
    style_emphasis_jp = ""
    if style_key:
        style_emphasis_jp = f"完全に{style_preset}スタイルで描いてください。他のスタイルは使用しないでください。必ず{style_preset}のビジュアル特性に忠実に従ってください。"
    
    # プロンプトの構築方法を変更：スタイルを最大限に強調
    if style_description and not style_already_in_prompt:
        # スタイルを前面に配置して強調（スタイルに最高の優先度を付ける）
        enhanced_prompt = f"{style_description}, {style_emphasis_jp} {base_prompt}, {quality_description}, MUST BE {style_preset.upper()} STYLE"
        
        # 特定のスタイルの場合、さらに強調
        if style_key == "pixel-art" or style_key == "pixel art" or "pixel" in style_key:
            logger.info(f"DEBUG: Applying special pixel art template")
            style_specific = "8-bit graphics, limited color palette, blocky pixels, pixelated graphics, retro game style, no anti-aliasing, clearly defined pixel grid"
            enhanced_prompt = f"{style_preset} style: {base_prompt}. Using {style_specific}. THIS IS PIXEL ART, NOT A PHOTOGRAPH. MUST BE PIXEL ART STYLE."
        elif style_key == "3d-model" or style_key == "3d render" or style_key == "3d rendering":
            logger.info(f"DEBUG: Applying special 3D model template")
            style_specific = "detailed 3D textures, volumetric lighting, ray tracing, physically based rendering"
            enhanced_prompt = f"{style_preset} style: {base_prompt}. Using {style_specific}. THIS IS A 3D RENDER, NOT A PHOTOGRAPH. MUST BE 3D RENDER STYLE."
        elif style_key == "painting" or style_key == "oil painting":
            logger.info(f"DEBUG: Applying special painting template")
            style_specific = "textured canvas, visible brushstrokes, artistic technique, traditional art style"
            enhanced_prompt = f"{style_preset} style: {base_prompt}. Using {style_specific}. THIS IS A PAINTING, NOT A PHOTOGRAPH. MUST BE PAINTING STYLE."
        else:
            enhanced_prompt = f"{style_preset} style: {base_prompt}. {style_description}. MUST BE {style_preset.upper()} STYLE."
    else:
        enhanced_prompt = f"{base_prompt}, {quality_description}"
    
    # スタイル適用に関するログ
    style_log = f"Applied style: {style_preset}" if style_description else "No specific style applied"
    logger.info(style_log)
    
    logger.info(f"Enhanced prompt: {enhanced_prompt}")
    
    return enhanced_prompt
