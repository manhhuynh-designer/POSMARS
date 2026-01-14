 
const InputMix0 = (function(){
 
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
        isTrainer: false,
        isLinear: true
      }, spec);

      // create textures:
      const create_texture = function(isFloat, isLinear){
        return Texture.instance({
          'isFloat': isFloat,
          'width': _spec.widthPx,
          'isPot': false,
          'isFlipY': false,
          'isLinear': isLinear
        });
      };

      const _textures = {
        greyScale: create_texture(false, false),
        blurs1Dim: [
          create_texture(false, _spec.isLinear),
          create_texture(false, _spec.isLinear),
          create_texture(false, _spec.isLinear)
        ],
        blurs: [
          create_texture(false, _spec.isLinear),
          create_texture(false, _spec.isLinear),
          create_texture(false, _spec.isLinear)
        ],
        output: create_texture(true, _spec.isLinear)
      };
      const _sourceBlurTextures = [_textures.greyScale, _textures.blurs[0], _textures.blurs[1]];

     
      // create shaders:
      const shaderFragmentSourceGreyScale = 'uniform sampler2D uun_source;\n\
        varying vec2 vUV;\n\
        const vec3 LUMA_LINEAR = vec3(0.2126, 0.7152, 0.0722);\n\
        const vec3 ONE3 = vec3(1.);\n\
        void main(void) {\n\
          vec3 color = texture2D(uun_source, vUV).rgb;\n\
          float c = dot(color, LUMA_LINEAR);\n\
          gl_FragColor = vec4(c);\n\
        }';

      const halfKernelSize = Math.round((_spec.blurKernelSizePx - 1) / 2);
      const dxy = 1.0 / _spec.widthPx;
      const shaderFragmentSourceBlur = 'uniform sampler2D uun_source;\n\
        const float HALFKERNELSIZE = 1.1111;\n\
        const float DXY = 2.2222;\n\
        uniform vec2 uun_dir;\n\
        varying vec2 vUV;\n\
        void main(void) {\n\
          float colorAcc = 0.0;\n\
          float sumK = 0.0;\n\
          for (float u=-HALFKERNELSIZE; u<= HALFKERNELSIZE; u+=1.0){\n\
            vec2 kxy = uun_dir * u;\n\
            vec2 uv = vUV + kxy * DXY;\n\
            float r = 1.2 * u / HALFKERNELSIZE;\n\
            float k = exp(-r*r);\n\
            colorAcc += k * texture2D(uun_source, uv).r;\n\
            sumK += k;\n\
          }\n\
          colorAcc /= sumK;\n\
          gl_FragColor = vec4(colorAcc, 0., 0., 1.);\n\
        }'
        .replace('1.1111', halfKernelSize.toFixed(2))
        .replace('2.2222', dxy.toFixed(6));

      const shaderFragmentSourceCompose = 'uniform sampler2D uun_greyScale, uun_blur0, uun_blur1, uun_blur2;\n\
        const float VARIANCEMIN = 1.1111;\n\
        const vec3 ONE3 = vec3(1.);\n\
        const float GAIN = 2.2222;\n\
        varying vec2 vUV;\n\
        void main(void) {\n\
          vec3 greyScale = texture2D(uun_greyScale, vUV).rgb;\n\
          float blur0 = texture2D(uun_blur0, vUV).r;\n\
          float blur1 = texture2D(uun_blur1, vUV).r;\n\
          float blur2 = texture2D(uun_blur2, vUV).r;\n\
          float square = greyScale.r * greyScale.r;\n\
          vec3 mean = vec3(blur0, blur1, blur2);\n\
          vec3 variance = max(ONE3*VARIANCEMIN, abs(vec3(square) - mean*mean) );\n\
          vec3 sigma = sqrt(variance);\n\
          gl_FragColor = vec4(greyScale.r, GAIN * (greyScale - mean) / sigma);\n\
        }'
        .replace('1.1111', _spec.varianceMin.toFixed(4))
        .replace('2.2222', _spec.gain.toFixed(4));

      // compile shaders:
      const uSamplerSource = {'uun_source': 0};
      const lowp = 'lowp';
      
      Shaders.add_shaders([
        {
          id: 'shp_inputMix0GreyScale',
          name: "PREPROCESSING INPUTMIX0 GREYSCALE",
          fragmentSource: shaderFragmentSourceGreyScale,
          samplers: uSamplerSource,
          uniformsNames: ['uun_source'],
          precision: lowp
        },
        {
          id: 'shp_inputMix0Blur',
          name: "PREPROCESSING INPUTMIX0 BLUR",
          fragmentSource: shaderFragmentSourceBlur,
          samplers: uSamplerSource,
          uniformsNames: ['uun_source', 'uun_dir'],
          precision: lowp
        },
        {
          id: 'shp_inputMix0Compose',
          name: "PREPROCESSING INPUTMIX0 COMPOSE",
          fragmentSource: shaderFragmentSourceCompose,
          samplers: {
            'uun_greyScale': 0,
            'uun_blur0': 1,
            'uun_blur1': 2,
            'uun_blur2': 3,
          },
          uniformsNames: ['uun_greyScale', 'uun_blur0', 'uun_blur1', 'uun_blur2'],
          precision: 'highp'
        }
        ]);

      const that = {
        // the input texture must be bound to Texture unit 0
        // the output texture will be bount to the Texture unit 0
        // the default FBO should be bound to the context
        process: function(inputTexture){
          // COMPUTE THE GREYSCALE TEXTURE
          Shaders.set('shp_inputMix0GreyScale');
          _textures.greyScale.set_asRenderTargetVp();
          VBO.draw_quad(_spec.isTrainer, false);

          // COMPUTE BLUR TEXTURES:
          Shaders.set('shp_inputMix0Blur');
          
          for (let i=0; i<3; ++i){
            // horizontal blur pass:
            Shaders.set_uniformDynamic2f('uun_dir', 1, 0);
            _textures.blurs1Dim[i].set_asRenderTarget();
            _sourceBlurTextures[i].bind_toSampler(0);
            VBO.draw_quad(false, false);

            // vertical blur pass:
            Shaders.set_uniformDynamic2f('uun_dir', 0, 1);
            _textures.blurs[i].set_asRenderTarget();
            _textures.blurs1Dim[i].bind_toSampler(0);
            VBO.draw_quad(false, false);
          }

          // COMPUTE OUTPUT
          Shaders.set('shp_inputMix0Compose');
          _textures.output.set_asRenderTarget();
          _textures.greyScale.bind_toSampler(0);
          _textures.blurs[0].bind_toSampler(1);
          _textures.blurs[1].bind_toSampler(2);
          _textures.blurs[2].bind_toSampler(3);
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
            name: 'greyScale',
            texture: _textures.greyScale
          },
          {
            name: 'blur0',
            texture: _textures.blurs[0]
          },
          {
            name: 'blur1',
            texture: _textures.blurs[1]
          },
          {
            name: 'blur2',
            texture: _textures.blurs[2]
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
})(); //end InputMix0
