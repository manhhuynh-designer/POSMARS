const Problem = function(spec){

  // get arguments (provided in the training script):
  const _defaultSpec = {
    'provider': null,
    'pool': null,
    'preprocessing': null,
    'postprocessing': null,
    'outputBlur': null,
    'options': {},
    'trainingDataRoot': ''
  };
  const _spec = Object.assign({}, _defaultSpec, spec);
  let _emptyBackgroundTexture = null;

  const _onLoadCallbacks = [];
  let _isProblemLoaded = false;

  const ioBlurParams = {
    isEnabled: false,
    pass: null,
    period: 0,
    initialRadiusPx: 0,
    radiusPx: 1
  };

  const _outputBlur = Object.assign({}, ioBlurParams);
  const _inputBlur = Object.assign({}, ioBlurParams);

  let _lastTrainingSample = null;


  // get the problem provider:
  const problemProviders = window['PROBLEMPROVIDERS'];
  if (!(_spec['provider'] in problemProviders)){
    const problemProvidersList = Object.keys(problemProviders);
    throw new Error('Cannot found the problem provider. Available problem providers: ' + problemProvidersList.join(', '));
  }
  const _provider = problemProviders[_spec['provider']];
  const _pooledProvider = PooledProblemProvider.instance(_provider, _spec['pool']);


  function draw_background() {
    if (_spec['preprocessing']){
      return _spec['preprocessing'].draw(_emptyBackgroundTexture);
    } else {
      draw_emptyImageProcessingPipeline();
      return null;
    }
  }


  function set_loaded(){
    _onLoadCallbacks.forEach(function(cb){
      cb();
    });
    _onLoadCallbacks.splice(0);
    _isProblemLoaded = true;
    return Promise.resolve();
  }


  function init_problem(problemSpec){
    return new Promise(function(accept, reject){
      const problemSpecCompleted = Object.assign({
        onload: accept,
        trainingDataRoot: _spec['trainingDataRoot']
      }, problemSpec);
      _provider.init(problemSpecCompleted);
    });
  }


  function init_imageProcessing(trainerSpecs, bgWidth){
    const initPromises = [];
    if (_spec['preprocessing']){
      initPromises.push(_spec['preprocessing'].init({
        width: bgWidth,
        trainingDataRoot: _spec['trainingDataRoot']
      })); 
    }
    if (_spec['postprocessing']){
      initPromises.push(_spec['postprocessing'].init({
        width: trainerSpecs.inputWidth,
        trainingDataRoot: _spec['trainingDataRoot']
      }));
    }
    init_ioBlur(_spec['outputBlur'], _outputBlur, trainerSpecs.neuralNetwork.get_outputWidth());
    init_ioBlur(_spec['inputBlur'], _inputBlur, trainerSpecs.inputWidth);
    return Promise.all(initPromises);
  }


  function init_ioBlur(blurSpec, blur, blurWidth){
    if (!blurSpec) return;
    blur.pass = create_ioBlurPass(blurSpec, blurWidth);
    blur.period = blurSpec['period'] || 100000;
    blur.initialRadiusPx = blurSpec['initialRadiusPx'] || 5;
    blur.isEnabled = true;
  }


  function create_ioBlurPass(spec, width){
    return Blur.instance({
      range: [1, spec['initialRadiusPx']],
      width: width,
      isFloatPrecision: true
    });
  }


  function draw_emptyImageProcessingPipeline(){
    VBO.bind_quad();
    FBO.bind_default();
  }


  function apply_postProcessing(sample){
    sample.input.bind_toSampler(0);
    let signalTexturePostprocessed = null;
    if (_spec['postprocessing']){
      signalTexturePostprocessed = _spec['postprocessing'].draw(sample.input);
    } else {
      draw_emptyImageProcessingPipeline();
      signalTexturePostprocessed = sample.input;
    }
    return Object.assign({}, sample, {
      input: signalTexturePostprocessed
    });
  }


  function process_ioBlur(inputTexture, blur, mbCount){
    const k = Math.log(2) / blur.period;
    const decayFactor = Math.exp(- mbCount * k);
    blur.radiusPx = blur.initialRadiusPx * decayFactor;
    inputTexture.bind_toSampler(0);
    return blur.pass.draw(blur.radiusPx);
  }


  const that = {
    init: function(trainerSpecs){
      const problemProviderSpec = Object.assign({}, trainerSpecs, _spec['options']);
      return init_problem(problemProviderSpec).then(function(){
        const bgWidth = (_provider.get_backgroundWidth === undefined) ? trainerSpecs.inputWidth : _provider.get_backgroundWidth();
        _emptyBackgroundTexture = Texture.instance({
          'isFloat': false,
          'isLinear': false,
          'width': bgWidth,
          'isPot': false
        });
        return init_imageProcessing(trainerSpecs, bgWidth).then(set_loaded);
      });
    },


    call_onLoad: function(cb){
      if (_isProblemLoaded){
        cb();
        return;
      } else {
        _onLoadCallbacks.push(cb);
      }
    },


    get_evaluationType: function(){
      return _provider.get_evaluationType();
    },


    get_testsCount: function(){
      return (_provider.get_testsCount === undefined) ? -1 : _provider.get_testsCount();
    },


    get_exportData: function(){
      return (_provider.get_exportData === undefined) ? {} : _provider.get_exportData();
    },


    needs_testSubstractExpectedTexture: function(){
      return (_provider.needs_testSubstractExpectedTexture) ? true : false;
    },


    compute_deltaMaskFromNNOutput: function(NNOutputTexture){
      if (!_provider.compute_deltaMaskFromNNOutput){
        return null;
      }
      if (_spec['pool']){
        throw new Error('Problem pooling do not work with dynamic delta mask computation');
      }
      FBO.bind_default();
      return _provider.compute_deltaMaskFromNNOutput(NNOutputTexture);
    },


    //PRECOMPILER_BEGINDELETE
    get_displayableTextures: function(){
      const r = {
        'problem abstract': [
          {
            texture: function(){ return _lastTrainingSample.input },
            name: 'input',
            //renderingMode: 'color'
          },
          {
            texture: function(){ return _lastTrainingSample.expected },
            name: 'expected',
            //renderingMode: 'color'
          },
          ]
      };
      if (_spec['preprocessing']){
        r['problem preproc.'] = _spec['preprocessing'].get_displayableTextures();
      }
      r['problem'] = _provider.get_displayableTextures();
      if (_spec['postprocessing']){
        r['problem postproc.'] = _spec['postprocessing'].get_displayableTextures();
      }

      if (_pooledProvider.isPooled){
        r['problemPooled'] = _pooledProvider.get_displayableTextures();
      }
      return r;
    },
    //PRECOMPILER_ENDDELETE
  

    can_displayGraphIdent: function(){
      return (_provider.can_displayGraphIdent === undefined) ? false : _provider.can_displayGraphIdent();
    },


    can_displayGraphClass: function(){
      return (_provider.can_displayGraphClass === undefined) ? false : _provider.can_displayGraphClass();
    },


    generate_testingSample: function(testInd){
      const backgroundTexture = draw_background();
      const testingSampleRaw = _provider.generate_testSample(backgroundTexture, testInd);
      return apply_postProcessing(testingSampleRaw);
      // note: do not apply outputBlur for testing otherwise evaluation will be easier at the beginning
    },


    generate_trainingSample: function(mbCount){
      FBO.bind_default();
      const backgroundTexture = draw_background();
      //const trainingSampleRaw = _provider.generate_sample(backgroundTexture, false);
      const trainingSampleRaw = _pooledProvider.generate_sample(backgroundTexture, false);
      let trainingSamplePostprocessed = apply_postProcessing(trainingSampleRaw);
      if (_inputBlur.isEnabled){
        trainingSamplePostprocessed = Object.assign({}, trainingSamplePostprocessed, {
          input: process_ioBlur(trainingSamplePostprocessed.input, _inputBlur, mbCount)
        });
      }
      if (_outputBlur.isEnabled){
        trainingSamplePostprocessed = Object.assign({}, trainingSamplePostprocessed, {
          expected: process_ioBlur(trainingSamplePostprocessed.expected, _outputBlur, mbCount)
        });
      }
      _lastTrainingSample = trainingSamplePostprocessed;
      return trainingSamplePostprocessed;
    },


    evaluate_test: function(NNResult){
      return _provider.evaluate_test(NNResult);
    },

    //PRECOMPILER_BEGINDELETE
    get_spec: function(){ // to debug
      return spec;
    }
    //PRECOMPILER_ENDDELETE
  }; // end that
  
  return that;
} //end Problem()


// make problem providers global:
if (!window['PROBLEMPROVIDERS']){
  window['PROBLEMPROVIDERS'] = {};
}
for (let key in window['PROBLEMPROVIDERS']) {
  window[key] = window['PROBLEMPROVIDERS'][key];
}

window['Problem'] = Problem;
