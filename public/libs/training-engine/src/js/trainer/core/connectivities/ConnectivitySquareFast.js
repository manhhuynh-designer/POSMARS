/*
 * construct new connectivity
 * 
 * Connectivity square between 2 layers
 * faster than connectivitySquare but should re_spect some constraints:
 * * sparsity should be an odd number
 * * the 2 layers should have the same size

 * _spec:
 *  <int> fromLayerSize: size of the top NeuronLayer
 *  <int> toLayerSize: size of the bottom neuron layer
 *  <int> toSparsity: sparsity from the toLayer POV
 *  <int> stride: stride. Default: 1
 *  <bool> debug: boolean
 *  <object> backup: backup of the connectivity
 *  <bool> initToZero: if true, init weights to 0 (default: false)
 *  
 */

const ConnectivitySquareFast = (function() {

  const __defaultSpec = {
    initToZero: false,
    backup: false,
    'fromLayerSize': -1,
    'toLayerSize': -1,
    'toSparsity': -1,
    'stride': 1
  };

  return {
    instance: function(spec) {
      //PRECOMPILER_BEGINLOG
      console.log('DEBUG in ConnectivitySquareFast - instance: spec = ', spec);
      //PRECOMPILER_ENDLOG
      const _spec = Object.assign({}, __defaultSpec, spec);

      function throw_error(msg){
        //PRECOMPILER_BEGINLOG
        const formattedMsg = 'ERROR in ConnectivitySquareFast -'
          + ' fromLayerSize = ' + _spec['fromLayerSize'].toString() + ' toLayerSize = ' + _spec['toLayerSize'].toString()
          + ' toSparsity = ' + _spec['toSparsity'].toString() + ': ' + msg;
        alert(formattedMsg);
        throw new Error(formattedMsg);
        //PRECOMPILER_ENDLOG
      }

      // COMPUTE AND CHECK PARAMETERS:
      const _fromSize = _spec['fromLayerSize'];
      const _toSize = _spec['toLayerSize'];

      //PRECOMPILER_BEGINLOG
      if (_fromSize < _toSize){
        throw_error('The to layer should be smaller or as big as the from layer!');
      }
      //PRECOMPILER_ENDLOG

      const _isShrink = (_toSize < _fromSize);
      const _shrinkFactor = _fromSize / _toSize; // should be pot

      const _weightsSize = _spec['toSparsity'] * _toSize;
      const _fromSparsity = _weightsSize / _fromSize;
      const _toSparsity = _spec['toSparsity'];

      //PRECOMPILER_BEGINLOG
      if (_fromSparsity%2 !== 1){
        throw_error('The from sparsity should be an odd number. Current value is ' + _fromSparsity.toFixed(4));
      }
      //PRECOMPILER_ENDLOG

      const _halfFromSparsity = (_fromSparsity-1) / 2;

      const _stride = _spec['stride'];

      //PRECOMPILER_BEGINLOG
      if (_toSize <= _stride*(_fromSparsity-1)){
        throw_error('The stride is too large, there will be connectivity overlaps');
      }
      //PRECOMPILER_ENDLOG
      
      // compute binding:
      const _weightsFromToArray = new Float32Array(_weightsSize*_weightsSize*4);
      
      for (let to_x = 0; to_x < _toSize; ++to_x) {
        for (let to_y = 0; to_y < _toSize; ++to_y) {

          let toU = to_x / _toSize; // toU, toV independant of patch position
          let toV = to_y / _toSize;

          toU += 0.5 / _toSize; // useless but more rigorous
          toV += 0.5 / _toSize; // useless but more rigorous

          for (let patch_x = 0; patch_x < _fromSparsity; ++patch_x) { // SHRINK: replace toSparsity by fromSparsity
            for (let patch_y = 0; patch_y < _fromSparsity; ++patch_y) { // SHRINK: replace toSparsity by fromSparsity

              const dx = _stride*(patch_x-_halfFromSparsity);// should = 0 if patch_x= (_toSparsity-1)/2
              const dy = _stride*(patch_y-_halfFromSparsity);


              for (let _shrink_y=0; _shrink_y<_shrinkFactor; ++_shrink_y){ // SHRINK: add loop
                for (let _shrink_x=0; _shrink_x<_shrinkFactor; ++_shrink_x){
                  // note: if no shrinking, _shrink_x = _shrink_y = 0

                  // SHRINK:
                  let from_x = (to_x+dx)*_shrinkFactor + _shrink_x;
                  let from_y = (to_y+dy)*_shrinkFactor + _shrink_y;

                  if (from_x<0){
                    from_x += _fromSize;
                  }
                  if (from_x>=_fromSize){
                    from_x -= _fromSize;
                  }
                  if (from_y<0){
                    from_y += _fromSize;
                  }
                  if (from_y>=_fromSize){
                    from_y -= _fromSize;
                  }

                  let fromU = from_x / _fromSize;
                  let fromV = from_y / _fromSize;             

                  fromU += 0.5 / _fromSize; // useless but more rigorous
                  fromV += 0.5 / _fromSize; // useless but more rigorous

                  if (fromU>=1.0 || fromU<0.0){
                    debugger;
                  }
              
                  const y = patch_y*_shrinkFactor + _shrink_y; // y in a toPatch
                  const x = patch_x*_shrinkFactor + _shrink_x; // x in a toPatch
                  if (x>=_toSparsity || y>=_toSparsity){
                    debugger;
                  }

                  const weight_i=(to_y*_toSparsity + y)*_weightsSize
                       +to_x*_toSparsity + x;

                  _weightsFromToArray[4 * weight_i] = fromU;     // R
                  _weightsFromToArray[4 * weight_i + 1] = fromV; // G
                  _weightsFromToArray[4 * weight_i + 2] = toU;   // B
                  _weightsFromToArray[4 * weight_i + 3] = toV;   // A

                } //end for _shrink_x
              } //end for _shrink_y

            } //end for patch_y
          } //end for patch_x

        } //end for to_y
      } //end for to_x


      const _textures = {
        weightsFromTo: null,
        weights: null,
        updatedWeights: null,
        bpWeightsDeltasSummed: null
      };

      
      // BUILD THE TEXTURES:
      // to retrieve the weight synapse parameter from a weight texture pixel
      // used during weight update
      _textures.weightsFromTo = Texture.instance({
        'isFloat': true,
        'isPot': false,
        'isFlipY': false,
        'width': _weightsSize,
        'array': _weightsFromToArray
      });

      //this texture store the weights as a list
      if (_spec.backup) {
        _textures.weights = Texture.instance(_spec.backup['weights']);
      } else {
        _textures.weights = Texture.instance({
          'isFloat': true,
          'isPot': false,
          'width': _weightsSize,
          isRandom: (_spec.initToZero) ? false : true,
          // about the choice of random params:
          // see http://neuralnetworksanddeeplearning.com/chap3.html#weight_initialization
          // part 'weight initialization'
          mean: 0.0,
          deviation: 1.0 / _spec['toSparsity']
        });
         
        if (_spec.initToZero){
          _textures.weights.fill_uniformColor(0);
        }
      }

      _textures.updatedWeights = Texture.instance({
        'isFloat': true,
        'isPot': false,
        'width': _weightsSize
      });

      _textures.bpWeightsDeltasSummed = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _weightsSize / _fromSparsity // fromSize
      });
      

      // COMPILE THE SHADER:
      const shaderSuffix = [_fromSize.toString(),_toSize.toString(),_toSparsity.toString(),_stride.toString()].join('_'); //SHRINK: add fromSize
      const _shaderId = 'weightsSquareFast_' + shaderSuffix;
      const _bpShaderId = 'bpWeightsDeltasSquareFast_' + shaderSuffix;

      if (!Shaders.exists(_shaderId)){
        const commonUniforms = [
          {
            type: '1f',
            name: 'uun_toSize',
            value: _toSize
          },
          {
            type: '1f',
            name: 'uun_stride',
            value: _stride
          }
        ];
        if (_isShrink){
          commonUniforms.push({
            type: '1f',
            name: 'uun_fromSize',
            value: _fromSize
          })
        }

        // build the feedforward shader:
        const shaderOnDemandId = (_isShrink) ? 'shp_sum_weightsSquareFastShrink' : 'shp_sum_weightsSquareFast';
        const shaderReplacements = (_isShrink) ? [
          _fromSparsity.toFixed(1), _shrinkFactor.toFixed(1)
        ] : [ _toSparsity.toFixed(1) ];

        Shaders.init_shaderOnDemand(shaderOnDemandId, _shaderId, shaderReplacements);
        Shaders.set_uniformsStatic(_shaderId, commonUniforms.concat([
          {
            type: '1i',
            name: 'uun_inputs',
            value: 0  
          },
          {
            type: '1i',
            name: 'uun_bias',
            value: 1  
          },
          {
            type: '1i',
            name: 'uun_weights',
            value: 4
          }]));

        //build the backprop shader:
        const shaderOnDemandBpId = (_isShrink) ? 'shp_bpWeightsDeltasSquareFastShrink' : 'shp_bpWeightsDeltasSquareFast';
        Shaders.init_shaderOnDemand(shaderOnDemandBpId, _bpShaderId, shaderReplacements);
        Shaders.set_uniformsStatic(_bpShaderId, commonUniforms.concat([
          {
            type: '1i',
            name: 'uun_deltas',
            value: 0  
          },
          {
            type: '1i',
            name: 'uun_weights',
            value: 1
          }]));
      }

      const that = {
        shouldSumFF: false, // if we need to sum after the draw_FF operation

        // GETTERS:

        get_fromSparsity: function() {
          return _fromSparsity;
        },


        get_weights: function() {
          return _textures.weights;
        },


        get_bpWeightsDeltasTexture: function() {
          return _textures.bpWeightsDeltasSummed;
        },


        get_updatedWeightsTexture: function() {
          return _textures.updatedWeights;
        },


        get_weightsFromToTexture: function() {
          return _textures.weightsFromTo;
        },


        get_wSize: function(){
          return _weightsSize;
        },


        export_toJSON: function() {
          return {
            'fromLayerSize': _spec['fromLayerSize'], // size of the top NeuronLayer
            'toLayerSize': _spec['toLayerSize'], // size of the bottom neuron layer
            'toSparsity': _spec['toSparsity'], // sparsity from the toLayer POV
            'weightsFromTo': false,
            'fromBindings': false,
            'toBindings': false,
            'squareFast': true,
            'weights': _textures.weights.export_toJSON(),
            'stride': _stride
          };
        },


        get_debugInfos: function() {
          
        },

        // DRAWING:

        // called by NeuronLayer.js - draw_feedforward
        // * The input texture must be bound on channel 0
        // * The bias texture is bound on channel 1
        // and the _fboInput FBO is bound
        process_feedforward: function() {
          // the output should have the to layer format
          Shaders.set(_shaderId);
          _textures.weights.bind_toSampler(4);
          VBO.draw_quad(true);
          Texture.unbind(4);
        },


        process_backpropagation: function(deltas) {
          // deltas of the next layer are bind on channel 0
          // the output should have the from layer format

          // sum wd per neuron without using mipmapping:
          Shaders.set(_bpShaderId);
          _textures.bpWeightsDeltasSummed.set_asRenderTargetVp();
          _textures.weights.bind_toSampler(1);
          VBO.draw_quad(true);

          Texture.unbind(1);
          _textures.bpWeightsDeltasSummed.bind_toSampler(0);
          
        }
      }; //end that;

      return that;
    } //end instance()

  };
})();