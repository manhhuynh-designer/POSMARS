/*
 * construct new connectivity
 * 
 * Connectivity between 2 layers
 * _spec:
 *  <int> fromLayerSize: size of the top NeuronLayer
 *  <int> toLayerSize: size of the bottom neuron layer
 *  <int> toSparsity: sparsity from the toLayer POV
 *  <bool> debug: boolean
 *  <object> backup: backup of the connectivity
 *  <bool> initToZero: if true, init weights to 0 (default: false)
 *  
 * 
 */

const ConnectivitySquare = (function() {

  const __defaultSpec = {
    'fromLayerSize': -1,
    'toLayerSize': -1,
    'toSparsity': -1,
    initToZero: false,
    backup: null
  };

  return {
    instance: function(spec) {
      //PRECOMPILER_BEGINLOG
      console.log('DEBUG in ConnectivitySquare - instance: spec =', spec);
      //PRECOMPILER_ENDLOG

      const _spec = Object.assign({}, __defaultSpec, spec);


      // Compute parameters:
      const _fromSize = _spec['fromLayerSize'];
      const _toSize = _spec['toLayerSize'];

      const _weightsSize = _spec['toSparsity'] * _toSize;
      const _fromSparsity = _weightsSize / _fromSize;
      const _toSparsity = _spec['toSparsity'];


      // Initialize arrays: 
      const nPx = _toSparsity * _toSize * _toSparsity * _toSize * 4;
      const _weightsFromToArray = new Array(nPx);
      const _toLayerIndicesArray = new Array(nPx);
      const _fromLayerIndicesArray = new Array(nPx);
      const _fromLayerIndicesCount = new Array(_fromSize * _fromSize);

      for (let i = 0; i < _fromLayerIndicesCount.length; ++i) {
        _fromLayerIndicesCount[i] = 0;
      }


      // Compute the linking:
      let weight_x = 0, weight_y = 0, _weight_i = 0;

      const offsetFrom = Math.floor(_toSparsity / 2);
      const fromToRatio = _fromSize / _toSize;
      
      for (let to_x = 0; to_x < _toSize; ++to_x) {
        for (let to_y = 0; to_y < _toSize; ++to_y) {

          const fromCenter_x = Math.round(to_x * fromToRatio);
          const fromCenter_y = Math.round(to_y * fromToRatio);

          let toU = to_x / _toSize; //toU, toV independant of patch position
          let toV = to_y / _toSize;
          
          toU += 0.5/_toSize; //useless but more rigorous
          toV += 0.5/_toSize; //useless but more rigorous

          for (let patch_x = 0; patch_x < _toSparsity; ++patch_x) {
            for (let patch_y = 0; patch_y < _toSparsity; ++patch_y) {

              let weightU = weight_x / _weightsSize;
              let weightV = weight_y / _weightsSize;

              let from_x = fromCenter_x + patch_x - offsetFrom;
              let from_y = fromCenter_y + patch_y - offsetFrom;

              if (from_x < 0) from_x += _fromSize;
              if (from_y < 0) from_y += _fromSize;
              if (from_x >= _fromSize) from_x -= _fromSize;
              if (from_y >= _fromSize) from_y -= _fromSize;

              let fromU = from_x / _fromSize;
              let fromV = from_y / _fromSize;                

              weightV = 1 - weightV - (1 / _weightsSize); //SI ON INVERSE PAS CA LA PERF DROP
              
              fromU += 0.5/_fromSize; //useless but more rigorous
              fromV += 0.5/_fromSize; //useless but more rigorous
              
              weightU += 0.5/_weightsSize; //useless but more rigorous
              weightV += 0.5/_weightsSize; //useless but more rigorous

              //if (fromU<0 || fromU>=1 || fromV<0 || fromV>=1) {
              //  console.log('fromFail - U=',fromU, 'V=',fromV);
              //}

              // save the binding:
              _weightsFromToArray[4 * _weight_i] = fromU;
              _weightsFromToArray[4 * _weight_i + 1] = fromV;
              _weightsFromToArray[4 * _weight_i + 2] = toU;
              _weightsFromToArray[4 * _weight_i + 3] = toV;

              let toix = to_x * _toSparsity + patch_x;
              let toiy = to_y * _toSparsity + patch_y;
              toiy = _toSize * _toSparsity-toiy-1;

              const toLayerIndicesArrayi = toiy * (_toSize * _toSparsity) + toix ;
              _toLayerIndicesArray[4 * toLayerIndicesArrayi] = weightU;
              _toLayerIndicesArray[4 * toLayerIndicesArrayi + 1] = weightV;
              _toLayerIndicesArray[4 * toLayerIndicesArrayi + 2] = fromU;
              _toLayerIndicesArray[4 * toLayerIndicesArrayi + 3] = fromV;

              const patchfrom_i = _fromLayerIndicesCount[from_y * _fromSize + from_x]++;
              const patchfrom_x = patchfrom_i % _fromSparsity;
              const patchfrom_y = (patchfrom_i - patchfrom_x) / _fromSparsity;

              //PRECOMPILER_BEGINLOG
              if (patchfrom_i >= _fromSize* _fromSize){
                console.log('ERROR in ConnectivitySquare: patchfrom_i too big !');
              }
              //PRECOMPILER_ENDLOG

              let fromix = (from_x * _fromSparsity + patchfrom_x);
              let fromiy = (from_y * _fromSparsity + patchfrom_y);

              fromiy = _fromSize * _fromSparsity-1-fromiy;

              const fromLayerIndicesArrayi = fromiy * (_fromSize * _fromSparsity) + fromix;
              _fromLayerIndicesArray[4 * fromLayerIndicesArrayi] = weightU;
              _fromLayerIndicesArray[4 * fromLayerIndicesArrayi + 1] = weightV;
              _fromLayerIndicesArray[4 * fromLayerIndicesArrayi + 2] = toU;
              _fromLayerIndicesArray[4 * fromLayerIndicesArrayi + 3] = toV;

              // Increase weight position:
              if (++weight_x >= _weightsSize) {
                weight_x = 0;
                ++weight_y;
              }
              ++_weight_i;

            } //end for patch_y
          } //end for patch_x

        } //end for to_y
      } //end for to_x


      // BUILD THE TEXTURES:
      const _textures = {
        weights: null,
        updatedWeights: null,
        weightsFromTo: null,
        fromLayerIndices: null,
        toLayerIndices: null,
        bpWeightsDeltas: null,
        bpWeightsDeltasSummed: null
      };


      // this texture store the weights:
      if (_spec.backup) {
        _textures.weights = Texture.instance(_spec.backup['weights']);
      } else {
        _textures.weights = Texture.instance({
          'isFloat': true,
          'isPot': true,
          'width': _weightsSize,
          isRandom: (_spec.initToZero) ? false : true,
          // about the choice of random params:
          // see http://neuralnetworksanddeeplearning.com/chap3.html#weight_initialization
          // part 'weight initialization'
          mean: 0,
          deviation: 1 / _spec['toSparsity']
        });

        if (_spec.initToZero){
          _textures.weights.fill_uniformColor(0);
        }
      }

      _textures.updatedWeights = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _weightsSize
      });

      // to retrieve the weight synapse parameter from a weight texture pixel
      // used during weight update:
      _textures.weightsFromTo = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _weightsSize,
        'array': new Float32Array(_weightsFromToArray)
      });

      // this texture store the weights indices ordered by the from layer:
      _textures.fromLayerIndices = Texture.instance({
        'width': _weightsSize,
        'isFloat': true,
        'array': new Float32Array(_fromLayerIndicesArray),
        'isPot': true
      });
      
      _textures.toLayerIndices = Texture.instance({
        'width': _weightsSize,
        'isFloat': true,
        'array': new Float32Array(_toLayerIndicesArray),
        'isPot': true
      });
      
      // set textures for backpropagation computing:
      _textures.bpWeightsDeltas = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _weightsSize,
        'isMipmap': true
      });
     
      _textures.bpWeightsDeltasSummed = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _weightsSize / _fromSparsity
      });
     


      const that = {
        shouldSumFF: true, // if we need to sum after the draw_FF operation
        
        // GETTERS:

        get_fromSparsity: function() {
          return _fromSparsity;
        },

        get_weights: function() {
          return _textures.weights;
        },

        get_fromIndicesTexture: function() {
          return _textures.fromLayerIndices;
        },

        get_toIndicesTexture: function() {
          return _textures.toLayerIndices;
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
            'fromLayerSize': _spec['fromLayerSize'], // size of the top NeuronLayer
            'toLayerSize': _spec['toLayerSize'], // size of the bottom neuron layer
            'toSparsity': _spec['toSparsity'], // sparsity from the toLayer POV
            'weights': _textures.weights.export_toJSON()
          };
        },


        get_debugInfos: function() {
          return {
            from: _fromLayerIndicesArray,
            to: _toLayerIndicesArray
          };
        },


        // DRAWING:

        // called by NeuronLayer.js - draw_feedforward
        // feed forward. The input texture must be bound on channel 0
        // and the _fboInput FBO is bound
        process_feedforward: function() {

          // the output should have the to layer format
          Shaders.set('shp_weights');

          _textures.weights.bind_toSampler(1);
          _textures.toLayerIndices.bind_toSampler(2);
          Texture.get_one().bind_toSampler(3);

          VBO.draw_quad(true);
        },


        process_backpropagation: function(deltas) {
          // the output should have the from layer format

          // compute weights * delta:
          // deltas of the next layer are bind on channel 0
          Shaders.set('shp_bpWeightsDeltas');
          _textures.bpWeightsDeltas.set_asRenderTargetVp();
          _textures.fromLayerIndices.bind_toSampler(1);
          _textures.weights.bind_toSampler(2);
          Texture.get_one().bind_toSampler(3);
          VBO.draw_quad(true);
          Texture.unbind(2);

          // sum wd per neuron using mipmapping:
          Shaders.set('shp_copy');
          _textures.bpWeightsDeltasSummed.set_asRenderTargetVp();
          _textures.bpWeightsDeltas.bind_toSampler(0);
          _textures.bpWeightsDeltas.generate_mipmap();
          VBO.draw_quad(true);

          _textures.bpWeightsDeltasSummed.bind_toSampler(0);
        }
      }; //end that;

      return that;
    } //end instance()

  };
})();