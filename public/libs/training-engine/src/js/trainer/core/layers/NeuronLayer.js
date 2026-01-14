/*
 * 
 * hidden or output neuron layer
 * 
 * _spec:
 *  - cost: 'quadratic' or 'crossentropy' . for output layer only
 *  - sparsity: 1 neuron of this layer is connected to sparsity*sparsity neurons of the previous layer
 *  - stride: not required for all kind of connectivities. default: 1
 *  - size: this neuron layer has size*size neurons
 *  - activation: activation function. Can be 'sigmoid', 'relu'
 *  - previous: previous layer
 *  - backup: false or backuped layer
 *  - connectivityUp: square, full, direct, squareFast, fullNPoT, conv
 *  - normalize: false by default. For output layer only
 *  - index: index of the layer in the NN (0 -> input layer)
 *  - clampOutput: if 'all', clamp the output in _spec.clampOutputRange
 *  - clampOutputRange: clamp values, 0 and 1 by default
 *  - decayBias: if true, apply l2 decay regularization to the bias
 *  - initToZero: boolean. default: false. Init weights to 0
 *  - maxPooling: none/{size: <2|4>}. default: none
 */
const NeuronLayer = (function() {
  const __defaultSpec = {
    // provided by NeuronNetwork:
    index: -1,
    backup: null,
    onload: null,
    previous: null,
    isOutputLayer: false,

    // provided by training script:
    'activation': 'copy',
    'betaRange': [0.001, 1.0],
    'betaDistributionPow': 2,
    'shiftRGBAMode': 0,

    // dimensions:
    'size': -1,

    // connectivity:
    'connectivityUp': 'direct',
    'stride': 1, // used only if squareFast
    'kernelsCount': 0, // only if convolutive connectivity
    'inputScale': [1.0, 1.0], // only if first conv layer
    'sparsity': 1,
    'maxPooling': null,

    // learning options:
    'decayBias': false,
    'initToZero': false,
    
    // only for output layer:
    'clampOutput': "none", // if "all", clamp the output in clampOutputRange. Its value can also be "mask" or "none"
    'clampOutputRange': [-1.0, 1.0],
    'normalize': false,
    'classesCount': 0, // for classification problems only
  };


  return {
    instance: function(spec) {
      // get Sqrt suffixed specs:
      const specSqrt = {};
      if (spec['sizeSqrt'] !== undefined ) specSqrt['size'] = spec['sizeSqrt'];
      if (spec['kernelsCountSqrt'] !== undefined ) specSqrt['kernelsCount'] = spec['kernelsCountSqrt'];
      if (spec['sparsitySqrt'] !== undefined ) specSqrt['sparsity'] = spec['sparsitySqrt'];
      if (spec['maxPooling'] && spec['maxPooling']['sizeSqrt']) {
        specSqrt['maxPooling'] = Object.assign({'size': spec['maxPooling']['sizeSqrt']}, spec['maxPooling']);
      }

      // set default parameters:
      const _spec = Object.assign({}, __defaultSpec, spec, specSqrt);
      
      const _outputMapResults = [], _results = [];
      
      // conv layer vars:
      const _conv = {
        kernelsCount: -1,
        isReorganize: false
      };

      const _neightborLayers = {
        previous: null,
        next: null
      };

      // SGD vars;
      let _SGDMomentum = 0, _counterMomentum = 0;
      
      const _dims = {
        wSize: -1,
        bSize: -1,
        outputSize: _spec['size'],
        previousOutputSize: -1
      };

      let _connectivity = null;

      const _textures = {
        input: null,
        beta: null,

        // feedforward:
        bias: null,
        inputSummed: null,
        inputSummedReorganized: null,
        inputSummedShifted: null,
        output: null,

        // conv layer textures:
        outputReorganized: null,
        bpDeltasReorganized: null,

        // backprop:
        bpDeltasRaw: null,
        bpDeltasShifted: null,
        bpDeltasMasked: null,

        // learning:
        dBias: null,
        dBiasCopy: null,
        previousDBias: null,
        updatedBias: null,
        dWeights: null,
        dWeightsCopy: null,
        previousDWeights: null,

        // last layer texture::
        outputClamped: null,
        outputNormalized: null,
        //outputSum: null,
        outputDiffExpected: null,
        delta0: null
      };

      const _texturePointers = {
        input: null,
        inputSummed: null,
        backpropOutput: null,
        backpropDeltas: null // point to bpDeltasRaw or bpDeltasMasked
      };

      switch(_spec['connectivityUp']){
        case 'full':
          _spec['sparsity'] = _spec.previous.get_outputSize();
          break;

        case 'direct':
          _spec['sparsity'] = 1;
          break; 
      }

      if (_spec['classesCount']){
        _spec['normalize'] = true;
        const nextPow2 = lib_maths.get_nextPow2(Math.sqrt(_spec['classesCount']));
        _spec['size'] = Math.pow(2, nextPow2);
        _spec['sparsity'] = ('sparsity' in _spec) ? _spec['sparsity'] : _spec.previous.get_width();
      }

      // MAXPOOLING FEATURE:
      let _maxPooling = null;
      if (_spec['maxPooling']){
        _dims.outputSize = _spec['size'] / _spec['maxPooling']['size'];
        _maxPooling = MaxPooling.instance(Object.assign({
          layerSize: _spec['size'],
          layerOutputSize: _dims.outputSize
        }, _spec['maxPooling']));
      }

      const _isHiddenLayer = !_spec.isOutputLayer;
      
      const _shaderActivationType = {
        'sigmoid': 'shp_sigmoid',
        'softplus': 'shp_softplus',
        'relu': 'shp_relu',
        'pelu': 'shp_elu',
        'copy': 'shp_copy',
        'elu': 'shp_elu',
        'elu01': 'shp_elu01',
        'selu': 'shp_selu',
        'gelu': 'shp_gelu',
        'arctan': 'shp_arctan',
        'arctan2': 'shp_arctan2'
      }[_spec['activation']];

      const _shaderBpType = {
        'sigmoid': 'shp_bpSigmoid',
        'softplus': 'shp_bpSoftplus',
        'relu': 'shp_bpRelu',
        'pelu': 'shp_bpPElu',
        'copy': 'shp_bpCopy',
        'elu': 'shp_bpElu',
        'elu01': 'shp_bpElu01',
        'selu': 'shp_bpSelu',
        'gelu': 'shp_bpGelu',
        'arctan': 'shp_bpArctan',
        'arctan2': 'shp_bpArctan2'
      }[_spec['activation']];

      const _shaderShiftRGBAType = [
        'undef',
        'shp_shiftRGBA1',
        'shp_shiftRGBA2'
      ][_spec['shiftRGBAMode']];

      // sum inputs and apply bias . organized grouped by to connectivity neurons
      const _inputTextureParams = {
        'isFloat': true,
        'isPot': true,
        'width': _spec['size']
      };
      _textures.inputSummed = Texture.instance(_inputTextureParams);
      if (_spec['shiftRGBAMode'] !== 0){
        _textures.inputSummedShifted = Texture.instance(_inputTextureParams);
      }

      if (_isHiddenLayer) {
        _textures.output = Texture.instance({
          'isFloat': true,
          'isPot': false,
          'width': _spec['size']
        });
      } 


      function should_clampOutput(){
        return (_spec['clampOutput'] && _spec['clampOutput'] !== 'none');
      }


      function process_reorganize(outputTexture){
        _textures.outputReorganized.set_asRenderTarget();
        outputTexture.bind_toSampler(0);
        Shaders.set('shp_reorganize');
        Shaders.set_uniformDynamic2f('uun_dims', _conv.kernelsCount, _dims.outputSize / _conv.kernelsCount);
        VBO.draw_quad(true);
        _textures.outputReorganized.bind_toSampler(0);
        return _textures.outputReorganized;
      }
      

      function process_shiftRGBA(inputSummedTexture){
        Shaders.set(_shaderShiftRGBAType);
        Shaders.set_uniformDynamic1f('uun_isInv', 0.0);
        _textures.inputSummedShifted.set_asRenderTarget();
        inputSummedTexture.bind_toSampler(0);
        VBO.draw_quad(true);
        return _textures.inputSummedShifted;
      }


      function process_clampOutput(outputTexture, clampMaskTexture){
        Shaders.set('shp_clampMask');
        Shaders.set_uniformDynamic2fv('uun_clampRange', _spec['classesCount'] ? [0.0, 1.0] : _spec['clampOutputRange']);
        _textures.outputClamped.set_asRenderTarget();
        outputTexture.bind_toSampler(0);
        const clampMaskTextureApplied = (clampMaskTexture && _spec['clampOutput'] === 'mask') ? clampMaskTexture : Texture.get_one();
        clampMaskTextureApplied.bind_toSampler(1);
        VBO.draw_quad(true);
        return _textures.outputClamped;
      }


      function process_normalize(outputTexture){
        Shaders.set('shp_copyScale');
        Shaders.set_uniformDynamic1f('uun_scale', 1 / _spec['size']);
        _textures.outputNormalized.set_asRenderTarget();
        outputTexture.bind_toSampler(0);
        VBO.draw_quad(true);
        return _textures.outputNormalized;
      }

     
      const that = {
        // GETTERS:
        get_kernelsCount: function(){
          return _conv.kernelsCount;
        },

        get_width: function() {
          return _spec['size'];
        },

        get_index: function(){
          return _spec.index;
        },

        get_outputSize: function(){
          return _dims.outputSize;
        },

        get_classesCount: function() {
          return _spec['classesCount'];
        },

        get_connectivity: function() {
          return _connectivity;
        },

        get_output: function() {
          return _texturePointers.backpropOutput;
        },

        get_bpDeltas: function() {
          return _texturePointers.backpropDeltas;
        },

        get_stride: function(){
          if (['full', 'fullNPoT', 'squareFast', 'square'].includes(_spec['connectivityUp'])){
            return _spec['stride'];
          }          
          return _conv.kernelsCount * _dims.previousOutputSize / _spec['size'];
        },

        is_conv: function(){
          return (_spec['connectivityUp'] === 'conv');
        },

        is_full: function(){
          return (_spec['connectivityUp'] === 'full');
        },

        is_shiftRGBA: function(){
          return (_spec['shiftRGBAMode'] !== 0);
        },


        bind_inputTexture: function(iSampler){
          _texturePointers.input.bind_toSampler(iSampler);
        },


        init_connectivity: function(){
          const connectivityBaseParams = {
            layerIndex: _spec.index,
            'fromLayerSize': _dims.previousOutputSize,
            'toLayerSize': _spec['size'],
            'toSparsity': _spec['sparsity'],
            initToZero: _spec['initToZero'],
            'stride': _spec['stride']
          };

          const connectivitySpec0 = {
            backup: (_spec.backup) ? _spec.backup['connectivity'] : null
          };

          switch(_spec['connectivityUp']){
            case 'full':
              _connectivity = ConnectivityFull.instance(Object.assign(connectivitySpec0, connectivityBaseParams));
            break;

            case 'conv':
              _conv.kernelsCount = _spec['kernelsCount'];
              if (_neightborLayers.previous.is_conv && _neightborLayers.previous.is_conv()){
                const previousKernelSize = _neightborLayers.previous.get_kernelsCount();
                const sparsityPerKernel = _spec['sparsity'] / previousKernelSize;
                //PRECOMPILER_BEGINLOG
                if (sparsityPerKernel !== Math.floor(sparsityPerKernel)){
                  console.log('ERROR in layer n°', _spec.index, ': the sparsity should be an integer multiple of the previous layer kernelsCount. sparsity =', _spec['sparsity'], ', previous kernel size =', previousKernelSize);
                  debugger;
                }
                //PRECOMPILER_ENDLOG
              } //end if previous layer conv
              if (_spec.backup){
                _connectivity = ConnectivityConv.instance(_spec.backup['connectivity']);
              } else {
                _connectivity = ConnectivityConv.instance(Object.assign({
                  'kernelsCount': _conv.kernelsCount,
                  'layerIndex': _spec.index,
                  'inputScale': _spec['inputScale']
                }, connectivityBaseParams));
              }

              /*if (_spec['inputScale'][0] !== 1 || _spec['inputScale'][1] !== 1){
                console.log('INFO in NeuronLayer: a conv layer has a special inputScale set');
                //debugger;
                _neightborLayers.previous.get_output().set_linearFiltering();
              }//*/
            break;

            case 'direct':
              _connectivity = ConnectivityDirect.instance(Object.assign(connectivitySpec0, connectivityBaseParams));
            break;

            case 'square':
              _connectivity = ConnectivitySquare.instance(Object.assign(connectivitySpec0, connectivityBaseParams));
            break;

            case 'squareFast':
              _connectivity = ConnectivitySquareFast.instance(Object.assign(connectivitySpec0, connectivityBaseParams));
            break;

            case 'fullNPoT':
              _connectivity = ConnectivityFullNPoT.instance(Object.assign(connectivitySpec0, connectivityBaseParams));
            break;
          } //end switch _spec['connectivityUp']
        }, //end init_connectivity()


        // called by NeuronNetwork while linking:
        set_previous: function(previousLayer) { // previous layer is upstream layer
          _neightborLayers.previous = previousLayer;
          _dims.previousOutputSize = _neightborLayers.previous.get_outputSize();

          that.init_connectivity();

          // apply weights to the input signal:
          if (_connectivity.shouldSumFF){
             const sizeConnections = _spec['size'] * _spec['sparsity'];
            _textures.input = Texture.instance({
              'isMipmap': true,
              'isFloat': true,
              'isPot': true,
              'width': sizeConnections
            });
          }

          _dims.wSize = (_spec['connectivityUp']==='conv') ? _connectivity.get_wSize() : _spec['size']*_spec['sparsity'];
          _dims.bSize = (_spec['connectivityUp']==='conv') ? _connectivity.get_bSize() : _spec['size'];

          if (_spec.backup) {
            _textures.bias = Texture.instance(_spec.backup['bias']);
          } else {
            _textures.bias = Texture.instance({
              'isFloat': true,
              'isPot': true,
              'width': _dims.bSize
            });
          }
          _textures.updatedBias = Texture.instance({
            'isFloat': true, 'isPot': true, 'width': _dims.bSize
          });
          _textures.dWeights = Texture.instance({
            'width': _dims.wSize, 'isFloat': true, 'isPot': false
          });
          _textures.previousDWeights = Texture.instance({
            'width': _dims.wSize, 'isFloat': true, 'isPot': false
          });
          _textures.dBias = Texture.instance({
            'width': _dims.bSize,
            'isFloat': true,
            'isPot': true
          });
        }, //end set_previous()

        
        //called by NeuronNetwork while linking
        set_next: function(nextLayer) { // downstream layer
          _neightborLayers.next = nextLayer;

          if (_spec['connectivityUp'] === 'conv'){
            _conv.isReorganize = _spec['connectivityUp']==='conv' && !nextLayer.is_full();
            if (_conv.isReorganize){
              _textures.inputSummedReorganized = Texture.instance(_inputTextureParams);
              _textures.outputReorganized = Texture.instance({
                'width': _dims.outputSize,
                'isFloat': true,
                'isFlipY': false,
                'isPot': false
              });
            } //end if should reorganize output
          } //end if connectivityUp==conv
        }, //end set_next()


        process_feedforward: function(inputTexture, isReturnResult, expectedTexture, clampMaskTexture) {
          // the input texture must be bound on the channel 0
          // apply weights to the input signal: 
          _texturePointers.input = inputTexture;


          if (_connectivity.shouldSumFF){
            _textures.input.set_asRenderTargetVp();
            if (_spec['connectivityUp'] === 'conv'){
              _textures.bias.bind_toSampler(2);
            }
            _connectivity.process_feedforward();

            // sum the input signals for each neuron and apply biases:
            _textures.inputSummed.set_asRenderTargetVp();

            if (_spec['connectivityUp'] === 'conv'){
              // bias are added in previous step. simply copy
              Shaders.set('shp_copy');
            } else {
              Shaders.set('shp_bias');
              _textures.bias.bind_toSampler(1);
              Shaders.set_uniformDynamic1f('uun_toSparsity2', _spec['sparsity'] * _spec['sparsity']);
            }

            _textures.input.bind_toSampler(0);
            _textures.input.generate_mipmap();
            VBO.draw_quad(true);

          } else { //end if should sum FF
            // connectivity directly outputs the summed inputs:
            _textures.inputSummed.set_asRenderTargetVp();
            _textures.bias.bind_toSampler(1);
            _connectivity.process_feedforward();
          }

          _texturePointers.inputSummed = _textures.inputSummed;
          if (that.is_shiftRGBA()){
            _texturePointers.inputSummed = process_shiftRGBA(_texturePointers.inputSummed);
          }
           
          // apply the activation function:
          Shaders.set(_shaderActivationType);
          _textures.output.set_asRenderTarget();
          _texturePointers.inputSummed.bind_toSampler(0);
          VBO.draw_quad(true);

          let returnedOutputTexture = _textures.output;
            
          if (_isHiddenLayer) {
            if (_maxPooling){
              returnedOutputTexture = _maxPooling.process_feedforward(_textures.output);
            }
            if (_conv.isReorganize){ // reorganize output
              returnedOutputTexture = process_reorganize(returnedOutputTexture);
            }

            _texturePointers.backpropOutput = returnedOutputTexture;
            returnedOutputTexture.bind_toSampler(0);

            return returnedOutputTexture;
          } //end if hidden layer

          // compute clamping for output layers only:
          _texturePointers.backpropOutput = _textures.output;
          if (should_clampOutput()) {
            _texturePointers.backpropOutput = process_clampOutput(_texturePointers.backpropOutput, clampMaskTexture);
          }
          if (_spec['normalize']){
            _texturePointers.backpropOutput = process_normalize(_texturePointers.backpropOutput);
          }

          if (isReturnResult) {
            // for monitoring, compute the difference between output and expected
            Shaders.set('shp_diff');
            _textures.outputDiffExpected.set_asRenderTargetVp();
            _texturePointers.backpropOutput.bind_toSampler(0);
            expectedTexture.bind_toSampler(1);
            VBO.draw_quad(true);

            const result = that.process_result(_textures.outputDiffExpected);
            _textures.output.bind_toSampler(0);
            return result;
          }
        }, //end process_feedforward()


        export_toJSON: function() {
          return {
            'size': _spec['size'],
            'sparsity': _spec['sparsity'],
            'activation': _spec['activation'],
            'connectivity': _connectivity.export_toJSON(),
            'bias': _textures.bias.export_toJSON(),
            'index': _spec.index,
            'classesCount': _spec['classesCount'],
            'connectivityUp': _spec['connectivityUp'],
            'normalize': _spec['normalize'],
            'kernelsCount': _spec['kernelsCount'],
            'maxPooling': (_maxPooling) ? _maxPooling.export_toJSON() : false,
            'isReorganize': _conv.isReorganize,
            'shiftRGBAMode': _spec['shiftRGBAMode']
          };
        },


        //PRECOMPILER_BEGINDELETE
        // only for debug purpose when NN.debug(layer) is called:
        debug: function() {
          // create a fake input texture, as a checkerboard
          const inputCheckerBoard = Texture.get_checkerboard(_dims.previousOutputSize);
          inputCheckerBoard.bind_toSampler(0);

          // if the texture is an output layer, set minibatchsize to 1:
          if (!_isHiddenLayer) {
            that.setup_output();
          }
          that.draw();

          if (_textures.input) _textures.input.debug();
          _textures.inputSummed.debug([_spec['size'] * _spec['sparsity'], 0]);
          _textures.output.debug([_spec['size'] * _spec['sparsity'] + _spec['size'], 0]);
        }, //end debug()


        debugTrainer: function() {
          if (_textures.input) _textures.input.debug();
          _textures.inputSummed.debug([_spec['size'] * _spec['sparsity'], 0]);
          _textures.output.debug([_spec['size'] * _spec['sparsity'] + _spec['size'], 0]);
        },
        //PRECOMPILER_ENDDELETE


        // only for output layer: format output layer at the size of the minibatch
        setup_output: function() {
          //PRECOMPILER_BEGINLOG
          console.log('INFO in NeuronLayer.js - setup_output() launched');
          //PRECOMPILER_ENDLOG

          // raw output:
          _textures.output = Texture.instance({
            'isFloat': true,
            'isPot': true,
            'isMipmap': true,
            'width': _spec['size']
          });
          
          if (!_isHiddenLayer) {
            _textures.outputDiffExpected = Texture.instance({
              'isFloat': true,
              'isPot': true,
              'width': _spec['size']
            });
          } //end if quadratic or crossentropy layer

          // output normalized:
          if (_spec['normalize']){
            _textures.outputNormalized = Texture.instance({
              'isFloat': true,
              'isPot': true,
              'width': _spec['size']
            });
          }

          // clamp output:
          if (should_clampOutput()) {
            _textures.outputClamped = Texture.instance({
              'isFloat': true,
              'isPot': false,
              'width': _spec['size']
            });
          }
          
          // precompute output positions for each minibatch
          // init results array to avoid memory allocation
          let x = 0, y = 0;
          const outputsCount = (_spec['classesCount']) ? _spec['classesCount'] : _spec['size'] * _spec['size'];
          for (let i = 0; i < outputsCount; ++i) {

            _outputMapResults.push((x + (_spec['size'] - 1 - y) * _spec['size']));
            _results.push([-1, -1, -1, -1]);

            ++x;
            if (x === _spec['size']) {
              x = 0;
              ++y;
            }
          } //end loop on classes
        },


        // Read the output FBO when all minibatch have been drawn
        // for output layer only:
        process_result: function(texture) {
          texture.draw_float();

          //GPU -> CPU transfert
          const buffers = texture.read_allFloat();

          // sort by RGBA channel:
          _outputMapResults.forEach(function(n, i) {
            _results[i][0] = buffers[0][n], // red
            _results[i][1] = buffers[1][n], // green
            _results[i][2] = buffers[2][n], // blue
            _results[i][3] = buffers[3][n]; // alpha
          }); //end _outputMapResults map

          return _results;
        },


        // Build backpropagation
        // see http://neuralnetworksanddeeplearning.com/chap2.html
        build_backPropagation: function() {
          const bpDeltaTextureSpecs = {
            'isFloat': true,
            'isPot': true,
            'width': _spec['size']
          };
          _textures.bpDeltasRaw = Texture.instance(bpDeltaTextureSpecs);
          if (that.is_shiftRGBA()){ 
            _textures.bpDeltasShifted = Texture.instance(bpDeltaTextureSpecs);
          }
          _textures.bpDeltasMasked = Texture.instance(bpDeltaTextureSpecs);
          if (_conv.isReorganize){
            _textures.bpDeltasReorganized = Texture.instance(bpDeltaTextureSpecs);
          }
          if (!_isHiddenLayer) {
            _textures.delta0 = Texture.instance({
              'isFloat': true,
              'isPot': false,
              'width': _spec['size']
            });
          }
        },


        // Compute the deltas
        // expected is an integer for classification problem and a texture for identification problem
        process_backpropagation: function(expectedTexture, deltaMaskTexture, cost) {
          // COMPUTE DELTAs
          // must be bind to layer 0:
          //  - if hidden layer: the previously computed layer delta
          //  - if output layer: none
          // deltas are organized depending on output layer
          let s = -1; // sparsity
          if (!_isHiddenLayer){ // output layer -> need to compute delta
            _textures.delta0.set_asRenderTargetVp();

            Shaders.set((cost==='quadratic') ? "shp_bpQuadratic" : "shp_bpCrossEntropy"); // compute base delta from expected value
            expectedTexture.bind_toSampler(1);
            Texture.get_one().bind_toSampler(2); // uun_sigmaPrimeZ
            const maskTexture = deltaMaskTexture || Texture.get_one(); // 2023-02-04 - huge bugfix
            maskTexture.bind_toSampler(3);
            _texturePointers.backpropOutput.bind_toSampler(0);
            VBO.draw_quad(true);
            
            _textures.delta0.bind_toSampler(0);
            s = 1.0;
          } // end if is output layer

          let inputSummedOrganized = _texturePointers.inputSummed;
          if (_isHiddenLayer){ // complicated - need to adapt downstream delta to this topology

            const deltasTexture = _neightborLayers.next.get_bpDeltas();
            if (_conv.isReorganize){
              // compute the inputSummed reorganized (as if output was natively outputReorganized)
              _textures.inputSummedReorganized.set_asRenderTargetVp();
              Shaders.set('shp_reorganize');
              _textures.inputSummed.bind_toSampler(0);
              Shaders.set_uniformDynamic2f('uun_dims', _conv.kernelsCount, _dims.outputSize / _conv.kernelsCount); // inverse than in process_feedforward()
              VBO.draw_quad(true);
              inputSummedOrganized = _textures.inputSummedReorganized;
              deltasTexture.bind_toSampler(0);// rebind downstream deltas texture
            } //end if _conv.isReorganize

            _neightborLayers.next.get_connectivity().process_backpropagation(deltasTexture); // downstream layer

            // sum(weights * deltas) is now bound to channel 0
            s = _neightborLayers.next.get_connectivity().get_fromSparsity();
          } //end if is hidden layer

          Shaders.set(_shaderBpType);
          Shaders.set_uniformDynamic1f('uun_toSparsity2', s*s);
          inputSummedOrganized.bind_toSampler(1);
          _textures.bpDeltasRaw.set_asRenderTargetVp();
          VBO.draw_quad(true);
          _texturePointers.backpropDeltas = _textures.bpDeltasRaw;


          if (that.is_shiftRGBA()){
            Shaders.set(_shaderShiftRGBAType);
            Shaders.set_uniformDynamic1f('uun_isInv', 1.0);
            _textures.bpDeltasShifted.set_asRenderTarget();
            _textures.bpDeltasRaw.bind_toSampler(0);
            VBO.draw_quad(true);
            _texturePointers.backpropDeltas = _textures.bpDeltasShifted;
          }

          // reshape deltas to match the real output format (where kernel are not mixed):
          if(_conv.isReorganize){
            Shaders.set('shp_reorganize');
            _textures.bpDeltasReorganized.set_asRenderTargetVp();
            _textures.bpDeltasRaw.bind_toSampler(0);
            Shaders.set_uniformDynamic2f('uun_dims', _dims.outputSize / _conv.kernelsCount, _conv.kernelsCount); // inverse than in process_feedforward()
            VBO.draw_quad(true);
            _texturePointers.backpropDeltas = _textures.bpDeltasReorganized;
          } //end if output has been reorganized

          // mask deltas if needed:
          if (!deltaMaskTexture && _maxPooling){
            deltaMaskTexture = _maxPooling.get_outputMaskTexture();
          }
          if (deltaMaskTexture){
            Shaders.set('shp_copyMaskScale');
            Shaders.set_uniformDynamic1f('uun_scale', 1.0);
            _textures.bpDeltasMasked.set_asRenderTargetVp();
            _texturePointers.backpropDeltas.bind_toSampler(0);
            deltaMaskTexture.bind_toSampler(1);
            VBO.draw_quad(true);
            _texturePointers.backpropDeltas = _textures.bpDeltasMasked;
          }

          // bind deltas for the previous layer (next processed):
          _texturePointers.backpropDeltas.bind_toSampler(0);
        }, //end process_backpropagation()


        // change weights and bias: LEARN :)
        process_learning: function(SGDLearningRate, l2Decay, learningMaskTexture) {
          
          // LEARNING CONSTANT:
          _texturePointers.backpropDeltas.bind_toSampler(0); // bind deltas
          
          // COMPUTE DW:
          switch(_spec['connectivityUp']){
            case 'full':
              Shaders.set('shp_learning_computeDWeightFull');
              const appliedLearningMaskTexture = learningMaskTexture || Texture.get_one();
              appliedLearningMaskTexture.bind_toSampler(3);
              _texturePointers.input.bind_toSampler(1);
              _connectivity.draw_sizes();
              break;

            case 'direct':
              Shaders.set('shp_learning_computeDWeightDirect');
              _texturePointers.input.bind_toSampler(1);
              break;

            case 'conv':
              _connectivity.process_learningWeights(); // only bind the learningDweight shader
              _texturePointers.input.bind_toSampler(1);
              break;

            default:
              Shaders.set('shp_learning_computeDWeight');
              _connectivity.get_weightsFromToTexture().bind_toSampler(1);
              _neightborLayers.previous.get_output().bind_toSampler(2);
              break;
          } // end switch _spec['connectivityUp']

          _textures.dWeights.set_asRenderTargetVp();
          Shaders.set_uniformDynamic1f('uun_SGDLearningRate', SGDLearningRate);
          VBO.draw_quad(true);

          
          if (_SGDMomentum !== 0){                
            _textures.dWeightsCopy.set_asRenderTarget();
            _textures.dWeights.bind_toSampler(0); // current dw
            if (_counterMomentum > 0){
              // add the SGDMomentum to DW:
              Shaders.set('shp_learning_addMomentum');
              _textures.previousDWeights.bind_toSampler(1);
              Shaders.set_uniformDynamic1f('uun_SGDMomentum', _SGDMomentum);
            } else {
              // only copy dw:
              Shaders.set('shp_copy');
            }
            VBO.draw_quad(true);
          } //end if SGDMomentum SGD

          //UPDATE WEIGHTS (APPLY DW)
          Shaders.set('shp_learning_applyDWeight');
          //_connectivity.get_fboUpdatedWeights().bind(true, false);
          _connectivity.get_updatedWeightsTexture().set_asRenderTargetVp();
          Shaders.set_uniformDynamic1f('uun_l2Decay', l2Decay);
          _connectivity.get_weights().bind_toSampler(0);
          ((_SGDMomentum === 0) ? _textures.dWeights : _textures.dWeightsCopy).bind_toSampler(1);
          VBO.draw_quad(true);

          _textures.previousDWeights.set_asRenderTarget(); // save previousDWeight for the next iteration
          ((_SGDMomentum === 0) ? _textures.dWeights : _textures.dWeightsCopy).bind_toSampler(0);
          Shaders.set('shp_copy');
          VBO.draw_quad(true)


          //UPDATE BIAS
          //COMPUTE DBIAS

          // bind deltas:
          _texturePointers.backpropDeltas.bind_toSampler(0);
          

          if (_spec['connectivityUp']==='conv'){
            _connectivity.process_learningBiases();
          } else {
            Shaders.set('shp_learning_computeDBias');
          }
          _textures.dBias.set_asRenderTargetVp();
          Shaders.set_uniformDynamic1f('uun_SGDLearningRate', SGDLearningRate);
          VBO.draw_quad(true);


          if (_SGDMomentum !== 0){
            // COPY DBIAS:
            _textures.dBiasCopy.set_asRenderTarget();
            _textures.dBias.bind_toSampler(0); // current dw
            if (_counterMomentum>0){
              // add the SGDMomentum to DW:
              Shaders.set('shp_learning_addMomentum');
              _textures.previousDBias.bind_toSampler(1);
              Shaders.set_uniformDynamic1f('uun_SGDMomentum', _SGDMomentum);
            } else {
              // only copy dw
              Shaders.set('shp_copy');
            }
            VBO.draw_quad(true);

            // copy dweight for the next iteration:
            _textures.previousDBias.set_asRenderTarget();
            _textures.dBiasCopy.bind_toSampler(0);
            Shaders.set('shp_copy');
            VBO.draw_quad(true);
          } //end if SGDMomentum SGD

          // UPDATE BIASES (APPLY DBIAS)
          Shaders.set('shp_learning_applyDWeight');
          _textures.updatedBias.set_asRenderTarget();
          Shaders.set_uniformDynamic1f('uun_l2Decay', (_spec['decayBias']) ? l2Decay : 0.0);
          _textures.bias.bind_toSampler(0);
          ((_SGDMomentum === 0) ? _textures.dBias : _textures.dBiasCopy).bind_toSampler(1);
          VBO.draw_quad(true);

          if (_SGDMomentum!==0) ++_counterMomentum;

          // replace weights and bias textures:
          Shaders.set('shp_copy');
          _connectivity.get_weights().set_asRenderTargetVp();
          _connectivity.get_updatedWeightsTexture().bind_toSampler(0);
          VBO.draw_quad(true);

          _textures.bias.set_asRenderTargetVp();
          _textures.updatedBias.bind_toSampler(0);
          VBO.draw_quad(true);
        }, //end process_learning()


        set_SGDMomentum: function(SGDMomentum) {
          _SGDMomentum = SGDMomentum;

          if (_SGDMomentum===0) return;
          _textures.dWeightsCopy = Texture.instance({
            'width': _dims.wSize, 'isFloat': true, 'isPot':false
          });
          _textures.dBiasCopy = Texture.instance({
            'width': _dims.bSize, 'isFloat': true, 'isPot':true
          });
          _textures.previousDBias = Texture.instance({
            'width': _dims.bSize, 'isFloat': true, 'isPot':true
          });
        }


        //PRECOMPILER_BEGINDELETE
        ,get_displayableTextures: function(){
          let displayableTextures = [];
          displayableTextures.push({
            name: 'inputs*w+b',
            texture: _textures.inputSummed
          }, {
            name: 'bias',
            texture: _textures.bias
          });
          if (_connectivity.shouldSumFF){
            displayableTextures.push({
              name: 'inputs*w',
              texture: _textures.input
            });
          }
          if (that.is_shiftRGBA()){
            displayableTextures.push({
              name: 'inputs*w+b shifted',
              texture: _textures.inputSummedShifted
            });
          }

          displayableTextures.push({
            name: 'weights',
            texture: _connectivity.get_weights()
          }, {
            name: 'uWeights',
            texture: _connectivity.get_updatedWeightsTexture()
          }, {
            name: 'dWeights',
            texture: _textures.dWeights
          });
          if (['square'].indexOf(_spec['connectivityUp'])!==-1){
            displayableTextures.push(
              {
              name: 'from_indices',
              texture: _connectivity.get_fromIndicesTexture()
              }, {
                name: 'to_indices',
                texture: _connectivity.get_toIndicesTexture()
              }
            );
          }
          if (_maxPooling){
            displayableTextures = displayableTextures.concat(_maxPooling.get_displayableTextures());
          }
          if (_conv.isReorganize){
            displayableTextures.push({
              name: 'out. Reorg.',
              texture: _textures.outputReorganized
            },{
              name: 'inp. Reorg.',
              texture: _textures.inputSummedReorganized
            },{
              name: 'BP deltas reorg',
              texture: _textures.bpDeltasReorganized
            });
          }
          if (_textures.output) {
            displayableTextures.push({
              name: 'output',
              texture: _textures.output
            });
          }
          if (should_clampOutput()) {
            displayableTextures.push({
              name: 'out. clped',
              texture: _textures.outputClamped
            });
          }
          if (_spec['normalize']){
            displayableTextures.push({
              name: 'out. norm.',
              texture: _textures.outputNormalized
            });
          }
          if (_spec.isOutputLayer) {
            displayableTextures.push({
              name: 'out.-exp.',
              texture: _textures.outputDiffExpected
            });
          }
          
          // Backprop textures:
          if (_neightborLayers.next && (_neightborLayers.next.get_connectivity())) {
            displayableTextures.push({
              name: 'BP Wdeltas',
              texture: _connectivity.get_bpWeightsDeltasTexture()// _neightborLayers.next.get_connectivity().get_bpWeightsDeltasTexture()
            });
          }
          displayableTextures.push({
            name: 'BP deltas raw',
            texture: _textures.bpDeltasRaw
          }, {
            name: 'BP deltas masked',
            texture: _textures.bpDeltasMasked
          });
          
          return displayableTextures;
        } //end get_displayableTextures()
        //PRECOMPILER_ENDDELETE

      }; //end that

      if (_spec.previous) {
        that.set_previous(_spec.previous);
      }

      if (_spec.onload) _spec.onload(that);

      return that;
    } //end instance
  };
})();