/*
 * this class is initialized using new
 * _specs:
 * 
 * - layers: array of layers
 * - onload: callback function to launch when loaded
 */

const NeuronNetwork = function(spec) {
  const _defaultSpec = {
    'exportData': {},
    onload: null,
    'layers': null
  };
  const _spec = Object.assign({}, _defaultSpec, spec);


  let _layers = [], _nLayers = -1;
  let _inputLayer = null, _outputLayer = null;
  const _loading = {
    nLoaded: 0,
    isLoaded: false,
    onloadCallbacks: []
  };
  

  // callback: called when a layer is loaded
  this.layer_isLoaded = function() {
    ++ _loading.nLoaded;
    if (_loading.nLoaded === _nLayers){
      //PRECOMPILER_BEGINLOG
      console.log('INFO in NeuronNetwork - layer_isLoaded(): All layers are loaded. This is cool.');
      //PRECOMPILER_ENDLOG
      _loading.isLoaded = true;
      if (_spec.onload) _spec.onload(this);
      _loading.onloadCallbacks.forEach(function(callback){
        callback();
      });
    } //end if full NN loaded
  };


  this.call_onload = function(callback){
    if (_loading.isLoaded){
      callback();
    } else {
      _loading.onloadCallbacks.push(callback);
    }
  };


  // make the layers:
  this.build_layers = function(layers) {
    //PRECOMPILER_BEGINLOG
    if (NeuronNetwork.prototype.layers) {
      console.log('INFO in NeuronNetwork - build_layers(): make layers from already saved layer');
    } else {
      console.log('INFO in NeuronNetwork - build_layers(): make layers from scratch');
    }
    //PRECOMPILER_ENDLOG

    // build layers:
    let indexBackup = -1;
    const self = this;
    _nLayers = layers.length;
    layers.forEach(function(layerSpec0, index) {
      //PRECOMPILER_BEGINLOG
      console.log('INFO in NeuronNetwork - build_layers(): build layer ', index, '...');
      //PRECOMPILER_ENDLOG
      let shouldCreateLayer = false;

      if (NeuronNetwork.prototype.layers) {
        //we open from an existing NN
        if (layerSpec0.shouldCreate) {
          shouldCreateLayer = true;
        } else {
          shouldCreateLayer = false;
          ++indexBackup;
        }
      } else {
        shouldCreateLayer = true;
      }
      
      const layerSpec = Object.assign( {}, layerSpec0,
        {
          onload: self.layer_isLoaded,
          index: index,
          backup: (shouldCreateLayer) ? false : NeuronNetwork.prototype.layers[indexBackup],
          previous: (index === 0) ? false : _layers[index - 1], // linking
          isOutputLayer: (index === _nLayers - 1)
        });
      
      let layer = null;
      if (index === 0){
        layer = InputLayer.instance(layerSpec);
      } else {
        layer = NeuronLayer.instance(layerSpec);
      }

      //PRECOMPILER_BEGINLOG
      console.log('INFO in NeuronNetwork - build_layers(): layer ', index, ' built successfully');
      //PRECOMPILER_ENDLOG
      _layers.push(layer);
    }); //end loop on layers

    // link backward:
    for (let layerIndex = 0; layerIndex < _nLayers - 1; ++layerIndex) {
      _layers[layerIndex].set_next(_layers[layerIndex + 1]);
    }

    _inputLayer = _layers[0]; // first layer
    _outputLayer = _layers[_nLayers - 1]; // last layer
    //PRECOMPILER_BEGINLOG
    console.log('INFO in NeuronNetwork - build_layers(): All layers have been built successfully');
    //PRECOMPILER_ENDLOG
  }; //end build_layers()


  // debug from live code
  this.debug_layer = function(layer_i) {
    _layers[layer_i].debug();
  };


  // debug from the trainer
  this.debugTrainer_layer = function(layer_i) {
    _layers[layer_i].debugTrainer();
  };


  this.process_feedforward = function(inputTexture, isReturnResult, expectedTexture, clampMaskTexture) {
    let result = inputTexture;
    _layers.forEach(function(layer) {
      result = layer.process_feedforward(result, isReturnResult, expectedTexture, clampMaskTexture);
    });
    return result;
  };


  this.get_inputLayer = function(trainer){
    return _inputLayer;
  };


  // backpropagation:
  this.build_backPropagation = function(expected) { // from output layer to input layer
    for (let layerIndex = _nLayers - 1; layerIndex > 0; --layerIndex) {
      _layers[layerIndex].build_backPropagation();
    }
  };


  this.process_backpropagation = function(expected, deltaMaskTextures, cost) {
    // process each layer except the input layer, beginning by the output layer:
    FBO.bind_default(); 
    for (let layerIndex = _nLayers - 1; layerIndex > 0; --layerIndex) {
      const layerIndexFromOutput = _nLayers - 1 - layerIndex; // 0 -> output layer
      const deltaMaskTexture = (deltaMaskTextures && deltaMaskTextures.length>layerIndexFromOutput) ? deltaMaskTextures[layerIndexFromOutput] : null;
      _layers[layerIndex].process_backpropagation(expected, deltaMaskTexture, cost);
    }
  };


  // learning:
  this.process_learning = function(SGDLearningRate, l2Decay, learningMaskTextures) {
    //console.log('NeuronNetwork.process_learning - SGDLearningRate = ', SGDLearningRate);
    // process each neuron layer except the input layer:
    FBO.bind_default();
    for (let layerIndex = 1; layerIndex < _nLayers; ++layerIndex) {
      const layerIndexFromOutput = _nLayers - 1 - layerIndex; // 0-> output layer
      const learningMaskTexture = (learningMaskTextures && learningMaskTextures.length>layerIndexFromOutput) ? learningMaskTextures[layerIndexFromOutput] : null;
      _layers[layerIndex].process_learning(SGDLearningRate[layerIndex - 1], l2Decay[layerIndex - 1], learningMaskTexture);
    }
  };

 
  // set the SGDMomentum for SGDMomentum SGD:
  this.set_SGDMomentum = function(SGDMomentum) {
    // process each neuron layer except the input layer:
    for (let layerIndex = 1; layerIndex < _nLayers; ++layerIndex) {
      _layers[layerIndex].set_SGDMomentum(SGDMomentum);
    }
  };


  // called by the trainer:
  this.get_inputWidth = function() {
    return _inputLayer.get_inputSize();
  };


  // called by the trainer:
  this.get_outputWidth = function() {
    return _outputLayer.get_width();
  };


  this.get_outputTexture = function() {
    return _outputLayer.get_output();
  };


  // called by the trainer:
  this.get_maxLayerSize = function() {
    let maxSize = 0;
    _layers.forEach(function(layer){
      maxSize = Math.max(maxSize, layer.get_width());
    });
    return maxSize;
  };


  this.get_layerSizes = function(){ // return layer sizes, from output to input layers included
    const ls = _layers.map(function(layer){
      return layer.get_width();
    });
    ls.reverse();
    return ls;
  };


  this.get_layers = function(){
    return _layers;
  };

  
  // called by the trainer:
  this.build_output = function() {
    _outputLayer.setup_output();
  };


  this.get_classesCount = function() {
    return _outputLayer.get_classesCount();
  };


  this.get_numberLayers = function() {
    return _nLayers;
  };


  // called in Code.js to export the code. returns an object not stringified (but serializable):
  this.export_toJSON = function(problemExportData, trainerData) {
    const exportData = Object.assign({}, problemExportData, _spec['exportData']);
    
    const networkJSON = Object.assign({
      'type': 'RGBA',
      'layers': new Array(_nLayers),
      'exportData': exportData 
    }, trainerData || {});
    _layers.forEach(function(layer, i) {
      networkJSON['layers'][i] = layer.export_toJSON();
    });

    return networkJSON;
  };


  if (_spec['layers']){
    this.build_layers(_spec['layers']);
  }
}; //end NeuronNetwork



// called when opening a saved simulation: set layers for next time that 'RUN will be pressed':
NeuronNetwork.prototype.set_layers = function(layers) {
  layers.forEach(function(layerParams) {
    layerParams.shouldCreate = false;
  });
  NeuronNetwork.prototype.layers = layers;
};

NeuronNetwork.prototype.layers = false;

window['NeuronNetwork'] = NeuronNetwork;