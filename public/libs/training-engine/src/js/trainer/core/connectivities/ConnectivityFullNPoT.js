/*
 * construct new connectivity
 * 
 * Connectivity full NPoT between 2 layers
 * _spec:
 *  <int> fromLayerSize: size of the top NeuronLayer
 *  <int> toLayerSize: size of the bottom neuron layer
 *  <bool> debug: boolean
 *  <object> backup: backup of the connectivity
 *  <bool> initToZero: if true, init weights to 0 (default: false)
 *  
 */
const ConnectivityFullNPoT = (function() {

  let __counter = 0;
  const __defaultSpec = {
    initToZero: false,
    backup: false,
    'fromLayerSize': -1,
    'toLayerSize': -1
  };

  return {
    instance: function(spec) {
      //PRECOMPILER_BEGINLOG
      console.log('DEBUG in ConnectivityFullNPoT - instance: spec = ', spec);
      //PRECOMPILER_ENDLOG

      const _spec = Object.assign({}, __defaultSpec, spec);

      function throw_error(msg){
        //PRECOMPILER_BEGINLOG
        const formattedMsg = 'ERROR in ConnectivityFullNPoT -'
          + ' fromLayerSize = ' + _spec['fromLayerSize'].toString() + ' toLayerSize = ' + _spec['toLayerSize'].toString()
          + ': ' + msg;
        alert(formattedMsg);
        throw new Error(formattedMsg);
        //PRECOMPILER_ENDLOG
      }

      // COMPUTE AND CHECK PARAMETERS:
      const _fromSize = _spec['fromLayerSize'];
      const _toSize = _spec['toLayerSize'];

      const _weightsSize = _fromSize * _toSize;      
      
      // compute binding. weightsFromToArray is organized according to TO layer:
      const _weightsFromToArray = new Float32Array(_weightsSize*_weightsSize*4);
      
      for (let to_x = 0; to_x < _toSize; ++to_x) {
        for (let to_y = 0; to_y < _toSize; ++to_y) {

          let toU = to_x / _toSize; // toU, toV independant of patch position
          let toV = to_y / _toSize;

          toU += 0.5 / _toSize; // useless but more rigorous
          toV += 0.5 / _toSize; // useless but more rigorous

          for (let from_x = 0; from_x < _fromSize; ++from_x) {
            for (let from_y = 0; from_y < _fromSize; ++from_y) {

              let fromU = from_x / _fromSize; // toU, toV independant of patch position
              let fromV = from_y / _fromSize;

              fromU += 0.5 / _fromSize; // useless but more rigorous
              fromV += 0.5 / _fromSize; // useless but more rigorous

              // coordinates on the weights texture:
              const weightX = to_x * _fromSize + from_x;
              const weightY = to_y * _fromSize + from_y;
              const weightI = _weightsSize * weightY + weightX; // index on the weights texture

              _weightsFromToArray[4 * weightI] = fromU;     // R
              _weightsFromToArray[4 * weightI + 1] = fromV; // G
              _weightsFromToArray[4 * weightI + 2] = toU;   // B
              _weightsFromToArray[4 * weightI + 3] = toV;   // A

            } // end from_y
          } // end from_x

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

      // this texture store the weights as a list
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
          deviation: 1.0 / _spec['fromLayerSize'] // fromSize is toSparsity
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
        'isPot': false,
        'width': _fromSize
      });
      

      // COMPILE THE SHADER:
      const shaderSuffix = __counter.toString();
      ++ __counter;
      
      // build the feedforward shader:
      const _shaderId = 'shp_sumWeightsFullNPoT' + shaderSuffix;
      Shaders.init_shaderOnDemand('shp_sumWeightsFullNPoT', _shaderId, [ _fromSize.toFixed(1) ]);
      Shaders.set_uniformsStatic(_shaderId, [
        {
          type: '1f',
          name: 'uun_toSize',
          value: _toSize
        },
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
        }]);

      // build the backprop shader:
      const _bpShaderId = 'shp_bpWeightsDeltasFullNPoT' + shaderSuffix;
      Shaders.init_shaderOnDemand('shp_bpWeightsDeltasFullNPoT', _bpShaderId, [ _toSize.toFixed(1) ]);
      Shaders.set_uniformsStatic(_bpShaderId, [
        {
          type: '1f',
          name: 'uun_fromSize',
          value: _fromSize
        },
        {
          type: '1i',
          name: 'uun_deltas',
          value: 0  
        },
        {
          type: '1i',
          name: 'uun_weights',
          value: 1
        }]);
    

      const that = {
        shouldSumFF: false, // if we need to sum after the draw_FF operation
        
        // GETTERS:
        get_fromSparsity: function() {
          return _toSize;
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

        export_toJSON: function() {
          return {
            'fromLayerSize': _fromSize, // size of the top NeuronLayer
            'toLayerSize': _toSize, // size of the bottom neuron layer
            'toSparsity': _fromSize, // sparsity from the toLayer POV
            'weightsFromTo': false,
            'fromBindings': false,
            'toBindings': false,
            'weights': _textures.weights.export_toJSON()
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

          // sum wd per neuron using mipmapping:
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