/*
 * 
 * Input neuron layer
 * should be the first layer of the Neuron Network
 * 
 * _spec: 
 *  - size: this neuron layer has size*size neurons
 *  - preprocessing: 'sobel' or false (default: false) or inputLightRegulation
 *  - preprocessingSize: size of the preprocessing image
 *  - buildInputShader: string of GLSL code. useful to use a custom shader
 *  - mask: url of an image used as a RGBA mask
 * 
 */
const InputLayer = (function() {

  const __defaultSpec = {
    'tilt': 0,
    'buildInputShader': null,
    'mask': null,
    'preprocessing': 'none',
    'preprocessingSize': 0,
    'size': -1,
    'isLinear': true,

    // for inputLightRegulation input layers:
    'nBlurPass': 1,

    // for inputMix0 and inputMix1 input layers:
    'varianceMin': 0.1,
    'blurKernelSizePx': 5,
    'gain': 1.0,

    // for inputCut4 input layers:
    'overlap': 0.0,
    'isNormalized': false,
    
    onload: null
  };


  return {
    instance: function(spec) {
      // get Sqrt suffixed specs:
      const specSqrt = {};
      if (spec['sizeSqrt'] !== undefined ) specSqrt['size'] = spec['sizeSqrt'];

      const _spec = Object.assign({}, __defaultSpec, spec, specSqrt);

      let _maskTexture = null;
      let _isTilt = false;
      let _isSetDs = false;

      // load a mask if necessary:
      if (_spec['mask']) {
        _maskTexture = Texture.instance({
          'isFloat': false,
          'url': _spec['mask']
        });
      } else {
        _maskTexture = Texture.get_whiteTexture();
      }

      let _preprocessingSize = (_spec['preprocessingSize']) ? _spec['preprocessingSize'] : _spec['size'];

      let _preprocessingShader = 'shp_copy';
      let _isExternalPreprocessing = false, _externalPreprocessing = null;

      let customInputShader = false, _customInputShaderGLSL = false;
      if (_spec['buildInputShader']){
        _customInputShaderGLSL = 'varying vec2 vUV; uniform sampler2D uSource;' + _spec['buildInputShader'];
        customInputShader = 'shp_customPreprocess';
        Shaders.add_shader({
          name: 'CUSTOM PREPROCESS',
          id: customInputShader,
          fragmentSource: _customInputShaderGLSL,
          uniformsNames: ['uSource']
        }, [{
          type: '1i',
          name: 'uSource',
          value: 0
        }]);
      }
      
      switch (_spec['preprocessing']) {
        case 'sobel':
          _preprocessingShader = 'shp_sobel';
          _isSetDs = true;
          break;

        case 'meanNormalization':
          _preprocessingShader = 'shp_meanNormalization';
          _isSetDs = true;
          break;

        case 'copy':
        case 'abort':
          _preprocessingShader = (customInputShader) ? customInputShader : 'shp_copy';
          break;

        case 'inputLightRegulation':
          _preprocessingShader = (customInputShader) ? customInputShader : 'shp_grayScale';
          _externalPreprocessing = InputLightRegulation.instance({
            inputWidth: _preprocessingSize,
            outputWidth: _spec['size'],
            nBlurPass: _spec['nBlurPass'],
            isTrainer: true
          });
          _isExternalPreprocessing = true;
          break;

        case 'inputMix0':
          _preprocessingShader = 'none';
          _externalPreprocessing = InputMix0.instance({
            widthPx: _spec['size'],
            varianceMin: _spec['varianceMin'],
            blurKernelSizePx: _spec['blurKernelSizePx'],
            gain: _spec['gain'] || 1.0,
            isTrainer: true,
            isLinear: _spec['isLinear']
          });
          _isExternalPreprocessing = true;
          break;

        case 'inputMix1':
          _preprocessingShader = 'none';
          _externalPreprocessing = InputMix1.instance({
            widthPx: _spec['size'],
            varianceMin: _spec['varianceMin'],
            blurKernelSizePx: _spec['blurKernelSizePx'],
            gain: _spec['gain'] || 1.0,
            isTrainer: true
          });
          _isExternalPreprocessing = true;
          break;

        case 'inputCut4':
          _preprocessingShader = 'none';
          _externalPreprocessing = InputCut4.instance({
            widthPx: _spec['size'],
            varianceMin: _spec['varianceMin'],
            blurKernelSizePx: _spec['blurKernelSizePx'],
            isNormalized: _spec['isNormalized'],
            overlap: _spec['overlap'],
            gain: _spec['gain'] || 1.0,
            isTrainer: true
          });
          _preprocessingSize *= _externalPreprocessing.get_inputResolutionIncreaseFactor();
          _isExternalPreprocessing = true;
          break;

        case 'grayScale':
          _preprocessingShader = 'shp_grayScale';
          break;

        case 'grayScaleTilt':
          _isTilt = true;
          _preprocessingShader = 'shp_grayScaleTilt';
          break;

        case 'rgbGrayTilt':
          _isTilt = true;
          _preprocessingShader = 'shp_rgbGrayTilt';
          break;

        case 'rgbDiffGrayTilt':
          _isTilt = true;
          _preprocessingShader = 'shp_rgbDiffGrayTilt';
          break;

        case 'direct':
        case 'none':
        case 'copyChannels':
          _preprocessingShader = 'shp_copyChannels';
          break;
        
        default:
          //PRECOMPILER_BEGINLOG
          throw new Error('Unknow preprocessing for input layer: ' + _spec['preprocessing']);
          //PRECOMPILER_ENDLOG
      } //end switch preprocessing

      // output signal
      let _outputTexture = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _spec['size'],
        'isLinear': _spec['isLinear']
      });
      let _nextLayer = null;

      _preprocessingSize = Math.ceil(_preprocessingSize);


      const that = {
        // GETTERS:

        get_width: function() {
          return _spec['size'];
        },
        

        get_inputSize: function() {
          return _preprocessingSize;
        },


        get_outputSize: function(){
          return that.get_width();
        },


        get_output: function() {
          if (_isExternalPreprocessing){
            return _externalPreprocessing.get_outputTexture();
          }
          return _outputTexture;
        },


        export_toJSON: function() {
          return {
            'preprocessing': _spec['preprocessing'],
            'size': _spec['size'],
            'nBlurPass': _spec['nBlurPass'],
            'varianceMin': _spec['varianceMin'],
            'blurKernelSizePx':_spec['blurKernelSizePx'],
            'gain': _spec['gain'],
            'type': 'input',
            'index': _spec.index,
            'mask': _spec['mask'],
            'tilt': _spec['tilt'],
            'isNormalized': _spec['isNormalized'],
            'overlap': _spec['overlap'],
            'customInputShader': _customInputShaderGLSL,
            'isLinear': _spec['isLinear'],
          };
        },


        // called by NeuronNetwork while linking:
        set_next: function(nextLayer) {
          _nextLayer = nextLayer;
          if (_isTilt){
            _spec['tilt'] = Math.round(nextLayer.get_stride()/2.0) / _spec['size'];
            Shaders.set_uniformsStatic(_preprocessingShader, [{name: 'uun_tilt', type:'1f', value: _spec['tilt']}]);
          }
        },


        process_feedforward: function(inputTexture, returnResult, expected) {
          FBO.bind_default();

          let externalPreprocessingInputTexture = null;
          
          if (_preprocessingShader === 'none'){
            externalPreprocessingInputTexture = inputTexture;
          } else {
            Shaders.set(_preprocessingShader);
            if (_isSetDs) {
              Shaders.set_uniformDynamic1f('uun_ds', 1 / _spec['size']);
            }
            _outputTexture.set_asRenderTargetVp();
            _maskTexture.bind_toSampler(1);
            VBO.draw_quad(true);

            // bind output to channel 0 for the next layer:
            _outputTexture.bind_toSampler(0);
            externalPreprocessingInputTexture = _outputTexture;
          }

          if (_isExternalPreprocessing){
            _externalPreprocessing.process(externalPreprocessingInputTexture);
          }

          return that.get_output();
        }


        //PRECOMPILER_BEGINDELETE
        ,get_displayableTextures: function(){
          let displayableTextures = [];
          if (_preprocessingShader !== 'none'){
            displayableTextures.push({
              name: 'input',
              texture: _outputTexture
            });
          }

          if (_externalPreprocessing && _externalPreprocessing.get_debugTextures){
            displayableTextures = displayableTextures.concat(_externalPreprocessing.get_debugTextures());
          }
          return displayableTextures;
        },

        // debug from the trainer:
        debugTrainer: function() {
          _outputTexture.debug();
        }
        //PRECOMPILER_ENDDELETE
      }; //end that

      if (_spec.onload) _spec.onload(that);

      return that;
    }
  };
})();