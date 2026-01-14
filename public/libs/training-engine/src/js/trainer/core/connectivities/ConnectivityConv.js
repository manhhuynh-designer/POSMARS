/*
 * _spec:
 * - <int> fromLayerSize: from layer size (side, POT)
 * - <int> toLayerSize: destination layer size
 * - <bool> initToZero: boolean, to init weights to 0
 * - <int> kernelsCount: size of the kernel
 */
const ConnectivityConv = (function() {

  const _defaultSpec = {
    'kernelsCount': -1,
    'toSparsity': -1,
    'toLayerSize': -1,
    'fromLayerSize': -1,
    'layerIndex': -1,
    'inputScale': [1.0, 1.0],
    initToZero: false,
    'weights': null
  };

  return {
    instance: function(spec) {
      //PRECOMPILER_BEGINLOG
  		console.log('DEBUG in ConnectivityConv - instance: spec =', spec);
      //PRECOMPILER_ENDLOG

      const _spec = Object.assign({}, _defaultSpec, spec);

      // compute parameters:
      const _kernelsCount = _spec['kernelsCount'];
      const _sparsity = _spec['toSparsity'];
      const _size = _kernelsCount * _sparsity; // size of weights
      const _wdSize = _sparsity * _spec['toLayerSize']; // number of connections
      const _kernelClusterSize = _spec['toLayerSize'] / _kernelsCount;
      const _fromSparsity = _wdSize / _spec['fromLayerSize'];

      // check some parameters:
      const stride = _kernelsCount * _spec['fromLayerSize'] / _spec['toLayerSize'];
      if (stride%1 !== 0){
        throw new Error('ERROR in ConnectivityConv: stride should be an integer. Got: ' + stride.toString() + ' Layer specs = ' + JSON.stringify(_spec));
      }
      const fromKernelClusterSize = _fromSparsity / _kernelsCount;
      if (_spec['layerIndex'] !== 1 && fromKernelClusterSize%1 !== 0){
        throw new Error('ERROR in ConnectivityConv: fromKernelClusterSize should be an integer. Got: ' + fromKernelClusterSize.toString() + ' Layer specs = '  + JSON.stringify(_spec));
      }
      
      // init and compile shaders:
      const _learningWeightsShaderId = 'shp_learning_computeDWeightConv' + _spec['layerIndex'].toString();
      const _learningBiasesShaderId = 'shp_learning_computeDBiasConv' + _spec['layerIndex'].toString();
      Shaders.init_shaderOnDemand('shp_learning_computeDWeightConv', _learningWeightsShaderId, [
        _kernelClusterSize.toFixed(1)
      ]);
      Shaders.init_shaderOnDemand('shp_learning_computeDBiasConv', _learningBiasesShaderId, [
        _kernelClusterSize.toFixed(1)
      ]);

      Shaders.set_uniformsStatic(_learningWeightsShaderId, [
        {
          type: '1i',
          name: 'uun_deltas',
          value: 0
        },
        {
          type: '1i',
          name: 'uun_inputs',
          value: 1
        },  
        {
          type: '1f',
          name: 'uun_fromSize',
          value: _spec['fromLayerSize']
        },
        {
          type: '1f',
          name: 'uun_toSize',
          value: _spec['toLayerSize']
        },
        {
          type: '1f',
          name: 'uun_kernelsCount',
          value: _kernelsCount
        },
        {
          type: '1f',
          name: 'uun_toSparsity',
          value: _sparsity
        },{
          type: '1f',
          name: 'uun_isDebug',
          value: 0
        }]);


      Shaders.set_uniformsStatic(_learningBiasesShaderId, [
        {
          type: '1i',
          name: 'uun_deltas',
          value: 0
        },
        {
          type: '1f',
          name: 'uun_fromSize',
          value: _spec['fromLayerSize']
        },
        {
          type: '1f',
          name: 'uun_toSize',
          value: _spec['toLayerSize']
        },
        {
          type: '1f',
          name: 'uun_kernelsCount',
          value: _kernelsCount
        },
        {
          type: '1f',
          name: 'uun_toSparsity',
          value: _sparsity
        }]);
			
       
      // BUILD THE TEXTURES:

      const _textures = {
        weights: null,
        updatedWeights: null,
        bpWeightsDeltas: null,
        bpWeightsDeltasSummed: null
      };

      /*this texture stores the weights organized by square patch following the upstream layer:
        - there is _spec.toLayerSize*_spec.toLayerSize patches
        - each patch has _spec.fromLayerSize*_spec.fromLayerSize pixels
      */
      const weightsTextureBaseSpecs = {
        'isFloat': true,
        'isPot': true,
        'width': _size,
        'isFlipY': false
      };

      if (_spec['weights']) { // restore from a backup
        _textures.weights = Texture.instance(_spec['weights']);
      } else { // initialize weights from scratch
        _textures.weights = Texture.instance(Object.assign({
          isRandom: (_spec.initToZero) ? false : true,
          mean: 0,
          deviation: 1 / _sparsity
        }, weightsTextureBaseSpecs));

        if (_spec.initToZero){
          _textures.weights.fill_uniformColor(0);
        }
      }


      _textures.updatedWeights = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _size
      });

      _textures.bpWeightsDeltas = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _wdSize,
        'isMipmap': true
      });
      
      _textures.bpWeightsDeltasSummed = Texture.instance({
        'isFloat': true,
        'isPot': true,
        'width': _spec['fromLayerSize']
      });
      

      const draw_sizes = function(){
        Shaders.set_uniformDynamic1f('uun_kernelsCount', _kernelsCount);
        Shaders.set_uniformDynamic1f('uun_toSparsity', _sparsity);
        Shaders.set_uniformDynamic1f('uun_toSize', _spec['toLayerSize']);
        Shaders.set_uniformDynamic1f('uun_fromSize', _spec['fromLayerSize']);
      };
      
      const that = {
        shouldSumFF: true, //if we need to sum after the draw_FF operation
        
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

        get_bpWeightsDeltasTexture: function() {
          return _textures.bpWeightsDeltas;
        },

        get_debugBpWeightsDeltas: function() {
          return _textures.bpWeightsDeltas;
        },

        get_updatedWeightsTexture: function() {
          return _textures.updatedWeights;
        },

        get_wSize: function(){
          return _size;
        },

        get_bSize: function(){
          return _kernelsCount;
        },
         
        export_toJSON: function() {
          return {
            'fromLayerSize': _spec['fromLayerSize'], // size of the top NeuronLayer
            'toLayerSize': _spec['toLayerSize'], // size of the bottom neuron layer
            'toSparsity': _sparsity, // sparsity from the toLayer POV
            'weights': _textures.weights.export_toJSON(),
            'kernelsCount': _kernelsCount,
            'inputScale': _spec['inputScale'],
            'layerIndex': _spec['layerIndex']
          };
        },


        // DRAWING:

        // called by NeuronLayer.js - draw_feedforward
        // feed forward.
        //   * The input texture must be bound on channel 0
        //   * biases are bound to channel 2
        // and the _fboInput FBO is bound
        process_feedforward: function() {
          Shaders.set('shp_weightsConv');
          Shaders.set_uniformDynamic2fv('uun_inputScale', _spec['inputScale']);
          draw_sizes();
          _textures.weights.bind_toSampler(1);
          VBO.draw_quad(true);
        },

        process_backpropagation: function() { // return wd grouped by upstream layer neuron
          // WARNING: this method is not called for the first upstream hidden layer

          // compute weights * deltas:
          Shaders.set('shp_bpWeightsDeltasConv');
          // deltas of the downstream layer are bind on channel 0
          // deltas are grouped by downstream layer neurons
          draw_sizes();
          _textures.bpWeightsDeltas.set_asRenderTargetVp();
          _textures.weights.bind_toSampler(1);
          VBO.draw_quad(true);
          Texture.unbind(2);

          // sum w*d per neuron using mipmapping:
          Shaders.set('shp_copy');
          _textures.bpWeightsDeltasSummed.set_asRenderTargetVp();
          _textures.bpWeightsDeltas.bind_toSampler(0);
          _textures.bpWeightsDeltas.generate_mipmap();
          VBO.draw_quad(true);

          _textures.bpWeightsDeltasSummed.bind_toSampler(0);
        },

        process_learningWeights: function(){
          Shaders.set(_learningWeightsShaderId);
        },

        process_learningBiases: function(){
          Shaders.set(_learningBiasesShaderId);
        }

      }; //end that;

      return that;
    } //end instance()

  };
})(); 
