 
const InputMix1 = (function(){
 
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
        signal: create_texture(false),
        blur1Dim: create_texture(false),
        blur: create_texture(false),
        output: create_texture(true)
      };
      
      // create shaders:
      const shaderFragmentSourceSignal = 'uniform sampler2D uun_source;\n\
        varying vec2 vUV;\n\
        const vec3 LUMA_LINEAR = vec3(0.2126, 0.7152, 0.0722);\n\
        const vec3 ONE3 = vec3(1.);\n\
        void main(void) {\n\
          vec3 color = texture2D(uun_source, vUV).rgb;\n\
          float c = dot(color, LUMA_LINEAR);\n\
          gl_FragColor = vec4(color.rgb, c);\n\
        }';

      const halfKernelSize = Math.round((_spec.blurKernelSizePx - 1) / 2);
      const dxy = 1.0 / _spec.widthPx;
      const shaderFragmentSourceBlur = 'uniform sampler2D uun_source;\n\
        const float HALFKERNELSIZE = 1.1111;\n\
        const float DXY = 2.2222;\n\
        uniform vec2 uun_dir;\n\
        varying vec2 vUV;\n\
        void main(void) {\n\
          vec3 colorAcc = vec3(0.0);\n\
          float sumK = 0.0;\n\
          for (float u=-HALFKERNELSIZE; u<= HALFKERNELSIZE; u+=1.0){\n\
            vec2 kxy = uun_dir * u;\n\
            vec2 uv = vUV + kxy * DXY;\n\
            float r = 1.2 * u / HALFKERNELSIZE;\n\
            float k = exp(-r*r);\n\
            colorAcc += k * texture2D(uun_source, uv).rgb;\n\
            sumK += k;\n\
          }\n\
          colorAcc /= sumK;\n\
          gl_FragColor = vec4(colorAcc, 1.0);\n\
        }'
        .replace('1.1111', halfKernelSize.toFixed(2))
        .replace('2.2222', dxy.toFixed(6));

      const shaderFragmentSourceCompose = 'uniform sampler2D uun_signal, uun_blur;\n\
        const float VARIANCEMIN = 1.1111;\n\
        const vec3 ONE3 = vec3(1.0);\n\
        const float GAIN = 2.2222;\n\
        varying vec2 vUV;\n\
        void main(void) {\n\
          vec4 signal = texture2D(uun_signal, vUV);\n\
          vec3 blur = texture2D(uun_blur, vUV).rgb;\n\
          float square = signal.a * signal.a;\n\
          vec3 mean = blur.rgb;\n\
          vec3 variance = max(ONE3*VARIANCEMIN, abs(vec3(square) - mean*mean) );\n\
          vec3 sigma = sqrt(variance);\n\
          gl_FragColor = vec4(signal.a, GAIN * (signal.rgb - mean) / sigma);\n\
        }'
        .replace('1.1111', _spec.varianceMin.toFixed(4))
        .replace('2.2222', _spec.gain.toFixed(4));

      // compile shaders:
      const uSamplerSource = {'uun_source': 0};
      const lowp = 'lowp';
      
      Shaders.add_shaders([
        {
          id: 'shp_inputMix1Signal',
          name: "PREPROCESSING INPUTMIX1 SIGNAL",
          fragmentSource: shaderFragmentSourceSignal,
          samplers: uSamplerSource,
          uniformsNames: ['uun_source'],
          precision: lowp
        },
        {
          id: 'shp_inputMix1Blur',
          name: "PREPROCESSING INPUTMIX1 BLUR",
          fragmentSource: shaderFragmentSourceBlur,
          samplers: uSamplerSource,
          uniformsNames: ['uun_source', 'uun_dir'],
          precision: lowp
        },
        {
          id: 'shp_inputMix1Compose',
          name: "PREPROCESSING INPUTMIX1 COMPOSE",
          fragmentSource: shaderFragmentSourceCompose,
          samplers: {
            'uun_signal': 0,
            'uun_blur': 1
          },
          uniformsNames: ['uun_signal', 'uun_blur'],
          precision: 'highp'
        }
        ]);

      const that = {
        // the input texture must be bound to Texture unit 0
        // the output texture will be bount to the Texture unit 0
        // the default FBO should be bound to the context
        process: function(inputTexture){
          // COMPUTE THE SIGNAL TEXTURE
          Shaders.set('shp_inputMix1Signal');
          _textures.signal.set_asRenderTargetVp();
          VBO.draw_quad(_spec.isTrainer, false);

          // COMPUTE BLUR TEXTURES:
          Shaders.set('shp_inputMix1Blur');
          
          // horizontal blur pass:
          Shaders.set_uniformDynamic2f('uun_dir', 1, 0);
          _textures.blur1Dim.set_asRenderTarget();
          _textures.signal.bind_toSampler(0);
          VBO.draw_quad(false, false);

          // vertical blur pass:
          Shaders.set_uniformDynamic2f('uun_dir', 0, 1);
          _textures.blur.set_asRenderTarget();
          _textures.blur1Dim.bind_toSampler(0);
          VBO.draw_quad(false, false);
          
          // COMPUTE OUTPUT
          Shaders.set('shp_inputMix1Compose');
          _textures.output.set_asRenderTarget();
          _textures.signal.bind_toSampler(0);
          _textures.blur.bind_toSampler(1);
          VBO.draw_quad(false, false);

          _textures.output.bind_toSampler(0);
        }, //end process()


        get_outputTexture: function(){
          return _textures.output;
        }


        //PRECOMPILER_BEGINDELETE
        ,
        get_debugTextures: function(){
          return [
          {
            name: 'signal',
            texture: _textures.signal
          },
          {
            name: 'blur',
            texture: _textures.blur
          },
          {
            name: 'output composed',
            texture: _textures.output
          }];
        }
        //PRECOMPILER_ENDDELETE

      }; //end that
      return that;
    } //end instance()
  } //end return value
})(); //end InputMix1
