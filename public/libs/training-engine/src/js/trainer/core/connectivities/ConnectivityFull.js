/*
 * _spec:
 * - <int> fromLayerSize: from layer size (side, POT)
 * - <int> toLayerSize: destination layer size
 * - <bool> initToZero: boolean, to init weights to 0
 */

const ConnectivityFull = (function() {

  const __defaultSpec = {
    initToZero: false,
    'fromLayerSize': -1,
    'toLayerSize': -1,
    backup: null
  };

  return {
    instance: function(spec) {
      //PRECOMPILER_BEGINLOG
      console.log('DEBUG in ConnectivityFull - instance: spec = ', spec);
      //PRECOMPILER_ENDLOG

      const _spec = Object.assign({}, __defaultSpec, spec);

      // compute parameters:
      const _size = _spec['fromLayerSize'] * _spec['toLayerSize'];
      const _sparsity = _spec['fromLayerSize'];
      
      const _fromSparsity = _spec['toLayerSize'];
      
      // BUILD THE TEXTURES:
      const _textures = {
        weights: null,
        updatedWeights: null,
        bpWeightsDeltas: null,
        bpWeightsDeltasSummed: null
      }

      /*this texture stores the weights organized by square patch following the upstream layer :
        - there is _spec.toLayerSize*_spec.toLayerSize patches
        - each patch has _spec.fromLayerSize*_spec.fromLayerSize pixels
      */
      if (_spec.backup) {
        _textures.weights = Texture.instance(_spec.backup['weights']);
      } else {

        _textures.weights = Texture.instance({
          'isFloat': true,
          'isPot': true,
          'width': _size,
          isRandom: (_spec.initToZero) ? false : true,
          mean: 0,
          deviation: 1 / _sparsity
        });

        if (_spec.initToZero){
          _textures.weights.fill_uniformColor(0);
        }
      } //end if no recover from backup

      _textures.updatedWeights = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _size
      });

      _textures.bpWeightsDeltas = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _size,
        'isMipmap': true
      });
      
      _textures.bpWeightsDeltasSummed = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _spec['fromLayerSize']
      });      
      

      const that = {
        shouldSumFF: true, // if we need to sum after the draw_FF operation

        // GETTERS:
        get_fromSparsity: function() {
          return _fromSparsity;
        },

        get_toSparsity: function() {
          return _sparsity;
        },

        get_weights: function() {
          return _textures.weights;
        },

        get_wSize: function(){
          return _size;
        },

        get_bpWeightsDeltasTexture: function() {
          return _textures.bpWeightsDeltasSummed;
        },

        get_debugBpWeightsDeltas: function() {
          return _textures.bpWeightsDeltas;
        },

        get_updatedWeightsTexture: function() {
          return _textures.updatedWeights;
        },

        export_toJSON: function() {
          return {
            'fromLayerSize': _spec['fromLayerSize'], // size of the top NeuronLayer
            'toLayerSize': _spec['toLayerSize'], // size of the bottom neuron layer
            'toSparsity': _sparsity, // sparsity from the toLayer POV
            'weightsFromTo': false,
            'fromBindings': false,
            'toBindings': false,
            'square': false,
            'weights': _textures.weights.export_toJSON()
          };
        },

        // DRAWING:

        // called by NeuronLayer.js - draw_feedforward
        // feed forward. The input texture must be bound on channel 0
        // and the _fboInput FBO is bound
        process_feedforward: function() {
          Shaders.set('shp_weightsFull');
          that.draw_sizes();
          _textures.weights.bind_toSampler(1);
          VBO.draw_quad(true);
        },


        draw_sizes: function() {
          Shaders.set_uniformDynamic1f('uun_toSize', _spec['toLayerSize']);
          Shaders.set_uniformDynamic1f('uun_fromSize', _spec['fromLayerSize']);
        },


        process_backpropagation: function(deltas) { // return weights*deltas grouped by upstream layer neuron
          // compute wd
          Shaders.set('shp_bpWeightsDeltasFull');
          
          // deltas of the downstream layer are bind on channel 0
          // deltas are grouped by downstream layer neurons
          that.draw_sizes();
          _textures.bpWeightsDeltas.set_asRenderTargetVp();
          _textures.weights.bind_toSampler(1);
          VBO.draw_quad(true);  
          
          // sum wd per neuron using mipmapping:
          _textures.bpWeightsDeltasSummed.set_asRenderTargetVp();
          Shaders.set('shp_copy');
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
