 
const InputCut4 = (function(){
 
  return {
    /*
      spec: 
        - <float> varianceMin: minimum variance. default: 0.1
        - <int> blurKernelSizePx: blur kernel pixel size. default: 5
        - <int> widthPx: width in pixels
        - <float> gain: gain factor. default: 1 (no gain)
    */
    instance: function(spec) {
      const _spec = Object.assign({
        varianceMin: 0.1,
        blurKernelSizePx: 9,
        widthPx: 128,
        gain: 1.0,
        overlap: 0.0,
        isNormalized: false,
        isTrainer: false
      }, spec);

      // create textures:
      const create_texture = function(isFloat){
        return Texture.instance({
          'isFloat': isFloat,
          'width': _spec.widthPx,
          'isPot': false,
          'isFlipY': false
        });
      };

      const _textures = {
        cut: create_texture(false),
        blur1Dim: null,
        blur: null,
        output: null,
      };

      if (_spec.isNormalized){
        _textures.blur1Dim = create_texture(false);
        _textures.blur = create_texture(false);
        _textures.output = create_texture(true);
      }
      
     
      // create shaders:
      const shaderFragmentSourceCut = 'uniform sampler2D uun_source;\n\
        const float OVERLAP = 1.1111;\n\
        varying vec2 vUV;\n\
        const vec3 LUMA_LINEAR = vec3(0.2126, 0.7152, 0.0722);\n\
        void main(void) {\n\
          vec2 uv = vUV * 0.5 * (OVERLAP + 1.0);\n\
          float uvOffset = 0.5 * (1.0 - OVERLAP);\n\
          float cBL =  dot(texture2D(uun_source, uv).rgb, LUMA_LINEAR); // bottom left corner\n\
          float cTL =  dot(texture2D(uun_source, uv + vec2(0., uvOffset)).rgb, LUMA_LINEAR); // top left corner\n\
          float cBR =  dot(texture2D(uun_source, uv + vec2(uvOffset, 0.)).rgb, LUMA_LINEAR); // bottom right corner\n\
          float cTR =  dot(texture2D(uun_source, uv + vec2(uvOffset, uvOffset)).rgb, LUMA_LINEAR); // top right corner\n\
          gl_FragColor = vec4(cBL, cTL, cBR, cTR);\n\
        }'
        .replace('1.1111', _spec.overlap.toFixed(4));

      // compile shaders:
      const uSamplerSource = {'uun_source': 0};
      const lowp = 'lowp';
      
      const shaders = [
        {
          id: 'shp_inputCut4Cut',
          name: "PREPROCESSING INPUTCUT4 CUT",
          fragmentSource: shaderFragmentSourceCut,
          samplers: uSamplerSource,
          uniformsNames: ['uun_source'],
          precision: lowp
        }
      ];

      if (_spec.isNormalized){
        const halfKernelSize = Math.round((_spec.blurKernelSizePx - 1) / 2);
        const dxy = 1.0 / _spec.widthPx;
        const shaderFragmentSourceBlur = 'uniform sampler2D uun_source;\n\
          const float HALFKERNELSIZE = 1.1111;\n\
          const float DXY = 2.2222;\n\
          uniform vec2 uun_dir;\n\
          varying vec2 vUV;\n\
          void main(void) {\n\
            vec4 colorAcc = vec4(0.0);\n\
            float sumK = 0.0;\n\
            for (float u=-HALFKERNELSIZE; u<= HALFKERNELSIZE; u+=1.0){\n\
              vec2 kxy = uun_dir * u;\n\
              vec2 uv = vUV + kxy * DXY;\n\
              float r = 1.2 * u / HALFKERNELSIZE;\n\
              float k = exp(-r*r);\n\
              colorAcc += k * texture2D(uun_source, uv);\n\
              sumK += k;\n\
            }\n\
            gl_FragColor = colorAcc / sumK;\n\
          }'
          .replace('1.1111', halfKernelSize.toFixed(2))
          .replace('2.2222', dxy.toFixed(6));

        const shaderFragmentSourceCompose = 'uniform sampler2D uun_signal, uun_blur;\n\
          const float VARIANCEMIN = 1.1111;\n\
          const vec4 ONE4 = vec4(1.0);\n\
          const float GAIN = 2.2222;\n\
          varying vec2 vUV;\n\
          void main(void) {\n\
            vec4 signal = texture2D(uun_signal, vUV);\n\
            vec4 blur = texture2D(uun_blur, vUV);\n\
            vec4 square = signal * signal;\n\
            vec4 mean = blur;\n\
            vec4 variance = max(ONE4*VARIANCEMIN, abs(square - mean*mean) );\n\
            vec4 sigma = sqrt(variance);\n\
            gl_FragColor = GAIN * (signal - mean) / sigma;\n\
          }'
          .replace('1.1111', _spec.varianceMin.toFixed(4))
          .replace('2.2222', _spec.gain.toFixed(4));

        shaders.push(
        {
          id: 'shp_inputCut4Blur',
          name: "PREPROCESSING INPUTCUT4 BLUR",
          fragmentSource: shaderFragmentSourceBlur,
          samplers: uSamplerSource,
          uniformsNames: ['uun_source', 'uun_dir'],
          precision: lowp
        },
        {
          id: 'shp_inputCut4Compose',
          name: "PREPROCESSING INPUTCUT4 COMPOSE",
          fragmentSource: shaderFragmentSourceCompose,
          samplers: {
            'uun_signal': 0,
            'uun_blur': 1
          },
          uniformsNames: ['uun_signal', 'uun_blur'],
          precision: 'highp'
        });
      }

      Shaders.add_shaders(shaders);

      function process_normalization(){
        // COMPUTE BLUR TEXTURES:
        Shaders.set('shp_inputCut4Blur');
        
        // horizontal blur pass:
        Shaders.set_uniformDynamic2f('uun_dir', 1, 0);
        _textures.blur1Dim.set_asRenderTarget();
        _textures.cut.bind_toSampler(0);
        VBO.draw_quad(false, false);

        // vertical blur pass:
        Shaders.set_uniformDynamic2f('uun_dir', 0, 1);
        _textures.blur.set_asRenderTarget();
        _textures.blur1Dim.bind_toSampler(0);
        VBO.draw_quad(false, false);
     
        // COMPUTE OUTPUT
        Shaders.set('shp_inputCut4Compose');
        _textures.output.set_asRenderTarget();
        _textures.cut.bind_toSampler(0);
        _textures.blur.bind_toSampler(1);
        VBO.draw_quad(false, false);
      };


      const that = {
        // the input texture must be bound to Texture unit 0
        // the output texture will be bount to the Texture unit 0
        // the default FBO should be bound to the context
        process: function(inputTexture){
          // COMPUTE THE GREYSCALE TEXTURE
          Shaders.set('shp_inputCut4Cut');
          _textures.cut.set_asRenderTargetVp();
          VBO.draw_quad(_spec.isTrainer, false);
          
          if (_spec.isNormalized){
            process_normalization();
            _textures.output.bind_toSampler(0);
          } else {
            _textures.cut.bind_toSampler(0);
          }
        },


        get_inputResolutionIncreaseFactor: function(){
          return (2.0 - _spec.overlap);
        },


        get_outputTexture: function(){
          return (_spec.isNormalized) ? _textures.output : _textures.cut;
        }


        //PRECOMPILER_BEGINDELETE
        ,
        get_debugTextures: function(){
          const debugTextures = [{
            name: 'cut',
            texture: _textures.cut
          }];

          if (_spec.isNormalized){
            debugTextures.push(
              {
                name: 'blur',
                texture: _textures.blur
              },
              {
                name: 'output',
                texture: _textures.output
              });
          }

          return debugTextures;
        }
        //PRECOMPILER_ENDDELETE

      }; //end that
      return that;
    } //end instance()
  } //end return value
})(); //end InputCut4
