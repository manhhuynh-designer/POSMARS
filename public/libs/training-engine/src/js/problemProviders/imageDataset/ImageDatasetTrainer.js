window['PROBLEMPROVIDERS']['ImageDatasetTrainer'] = (function(){

  const _defaultSpec = {
    outputFactor: 1,
    problem: 'classification',
    batchsCount: -1,
    batchPrefix: '',
    batchOutputPrefix: '',
    outputProcess: null,
    batchJson: null,
    batchX: 1,
    batchY: 1,
    batchOffset: 0,
    dir: ''
  };

  let _spec = null;
  let _lastGeneratedSample = null;

  const _batchsOutput = [], _batchsInput = [];
  let _labels = null;
  let _classesCount = -1;

  const _loading = {
    nToLoad: 0,
    nLoaded: 0
  };

  let _testsCount = -1, _nSamplesPerBatch = -1;

  let _expectedClassIndex = -1;

  const _textures = {
    input: null,
    expectedOutput: null,
    expectedClassificationOutputs: [],
    classificationDeltaMask: null
  };

  const _dims = {
    inputWidth: -1,
    outputWidth: -1
  };

  let _imageTilter = null;


  function check_isLoaded(){
    if (++_loading.nLoaded !== _loading.nToLoad) {
      return;
    }
    //PRECOMPILER_BEGINLOG
    console.log('INFO in ImageDatasetTrainer: all is loaded');
    //PRECOMPILER_ENDLOG
    _spec.onload();
  }


  function load_batchesInput(){
    for (let i = 0; i < _spec.batchsCount; ++i) {
      const iStr = (i + _spec.batchOffset).toString();
      const baseName = _spec.batchPrefix + iStr + '.png';
      _batchsInput.push(Texture.instance({
        'isFloat': false,
        'isPot': false,
        'url': _spec.dir + baseName,
        callback: check_isLoaded,
        name: baseName
      }));

      if (_spec.problem === 'identification') {
        // load the expected output for identification problem
        // because the texture is saved as a 8Bit PNG, we need to convert it as a float texture

        const outputExtension = (_spec.outputProcess === 'json2float') ? 'json' : 'png';
        const baseNameOutput = _spec.batchOutputPrefix + iStr + '.' + outputExtension;

        const textureBatchOutput = Texture.instance({
          'isFloat': (outputExtension !== 'png'),
          'isPot': false,
          'url': _spec.dir + baseNameOutput,
          callback: check_isLoaded,
          name: baseNameOutput
        });
        _batchsOutput.push(textureBatchOutput);
      } //end if identification problem

    } //end loop on batchs
  }


  // transform each expected output texture to a float texture
  // for identification problem only:
  function build_batchOutput(batchOutput, index) {
    
    // create the float texture:
    const floatTexture = Texture.instance({
      'isFloat': true,
      'isPot': false,
      'width': batchOutput.get_size()
    });

    // link the FBO to the texture:
    floatTexture.set_asRenderTargetVp();

    // fill the float texture:
    switch (_spec.outputProcess) {
      case 'rgba2float':
        batchOutput.draw_8bitsToFloat();
        break;

      case 'json2float':
      case 'direct':
        batchOutput.draw_copyScaled(_spec.outputFactor);
        break;

      //PRECOMPILER_BEGINLOG
      default:
        console.log('ERROR in ImageDatasetTrainer.js - build_batchOutput: unknow value for outputProcess : ', _spec.outputProcess);
        break;
      //PRECOMPILER_ENDLOG
    } //end switch(_spec.outputProcess)

    // replace the float texture:
    _batchsOutput[index] = floatTexture;
  }


  function build_expectedOutputs(){
    if (_spec.problem === 'identification'){
      GL.clearColor(0, 0, 0, 0);
      FBO.bind_default();
      _batchsOutput.forEach(build_batchOutput);

      _textures.expectedOutput = Texture.instance({
        'isFloat': true,
        'isPot': false,
        'width': _dims.outputWidth,
        name: "Expected output working texture"
      });
    }

    if (_spec.problem === 'classification') {
      build_classificationOutputMask();
      for (let i=0; i<_classesCount; ++i){
        build_classificationExpectedTexture(i);
      }
      lib_ajax.get_json(_spec.dir + _spec.batchJson, function(data){
        _labels = data;
        check_isLoaded();
      });
    }
  }


  function build_classificationOutputMask(){
    // Build output mask texture:
    const w = _dims.outputWidth;
    const w2 = w * w;
    const elts = new Uint8Array(Math.pow(4*w, 2));
    for (let i=0; i<w2; ++i){
      const v = (i<_classesCount) ? 255 : 0;
      elts[i*4] = v;
      elts[i*4+1] = v;
      elts[i*4+2] = v;
      elts[i*4+3] = v;
    }

    _textures.classificationDeltaMask = Texture.instance({
      'isFloat': false,
      'width': w,
      'array': elts
    });
  }


  function build_classificationExpectedTexture(classIndex){
    // Build expected output texture for classIndex
    const arr = new Uint8Array(_dims.outputWidth * _dims.outputWidth * 4);
    const x = classIndex % _dims.outputWidth;
    const y = (classIndex - x) / _dims.outputWidth;
    const i = 4*(x + _dims.outputWidth * y);

    arr[i] = 255,   // R
    arr[i+1] = 255, // G
    arr[i+2] = 255, // B
    arr[i+3] = 255; // A

    const expectedOutputTexture = Texture.instance({
      'array': arr,
      'width': _dims.outputWidth,
      'isFloat': false,
      'isPot': false
    });

    _textures.expectedClassificationOutputs.push(expectedOutputTexture);
  }


  const that = {
    init: function(spec){
      _spec = Object.assign({}, _defaultSpec, spec);

      // compute and get parameters:
      _dims.inputWidth = _spec.neuralNetwork.get_inputWidth();
      _dims.outputWidth = _spec.neuralNetwork.get_outputWidth();
      _nSamplesPerBatch = _spec.batchX * _spec.batchY;
      _testsCount = _spec.batchsTestCount * _nSamplesPerBatch;

      // image tilter to tilt input image:
      if (spec.tilt){
        _imageTilter = ImageTilter.instance(spec.tilt);
      }

      switch (_spec.problem) {
        case 'classification':
          _classesCount = _spec.neuralNetwork.get_classesCount();
          _loading.nToLoad += _spec.batchsCount + 1; // 1 JSON + batches
          break;

        case 'identification':
          _loading.nToLoad += 2 * _spec.batchsCount; // batches + batches output expected
          break;

        default:
          throw new Error('Unknown problem type' + _spec.problem);
      }

      _textures.input = Texture.instance({
        'isFloat': true,
        'isPot': false,
        'width': _dims.inputWidth,
        name: "Trainer signal"
      });

      build_expectedOutputs();
      load_batchesInput();

      check_isLoaded();
    },


    draw_input: function(batchIndex, sampleIndex){
      const batchInputTexture = _batchsInput[batchIndex];
      const offsetX = sampleIndex % _spec.batchX;
      const offsetY = _spec.batchY - ((sampleIndex - offsetX) / _spec.batchX) - 1;
      const scaleX = 1.0 / _spec.batchX;
      const scaleY = 1.0 / _spec.batchY;
      const offsetXYScaled = [offsetX * scaleX, offsetY * scaleY];
      const scaleXY = [scaleX, scaleY];

      FBO.bind_default();
      _textures.input.set_asRenderTargetVp();
      
      if (_imageTilter === null){
      
        Shaders.set('shp_batchCutSimple');
        batchInputTexture.bind_toSampler(0);
        Shaders.set_uniformDynamic2fv('uun_offset', offsetXYScaled);
        Shaders.set_uniformDynamic2fv('uun_scale', scaleXY);
        VBO.draw_quad(true);
      
      } else {

        _imageTilter.draw(batchInputTexture, offsetXYScaled, scaleXY);

      }
      
      _textures.input.bind_toSampler(0);
    },


    draw_identificationExpectedOutput: function(batchIndex, sampleIndex){
      const batchOutputTexture = _batchsOutput[batchIndex];
      const offsetX = sampleIndex % _spec.batchX; //integer
      const offsetY = _spec.batchY - ((sampleIndex - offsetX) / _spec.batchX) - 1; // integer
      const offsetXYScaled = [offsetX / _spec.batchX, offsetY / _spec.batchY];

      FBO.bind_default();
      _textures.expectedOutput.set_asRenderTargetVp();
      
      switch (_spec.outputProcess) {
      
        case 'rgba2float':
          Shaders.set('shp_batchCutSimple');
          Shaders.set_uniformDynamic2fv('uun_offset', offsetXYScaled);
          batchOutputTexture.bind_toSampler(0);
          VBO.draw_quad(true);
          break;

        case 'direct':
        case 'json2float':
          _imageTilter.reDraw(batchOutputTexture);
          break;

      }

      // ready for the input processing
      return _textures.expectedOutput;
    },


    generate_sample: function(backgroundTexture, isTest, batchIndex, sampleIndex){

      if (!isTest){
        batchIndex = lib_random.get_int(_spec.batchsCount - _spec.batchsTestCount);
        sampleIndex = lib_random.get_int(_spec.batchX * _spec.batchY);
      }

      // get expected output:
      let expectedOutputTexture = null, deltaMask = null;
      
      if (_imageTilter !== null){
        _imageTilter.set_transform();
      }

      switch (_spec.problem) {
        case 'classification':
          _expectedClassIndex = _labels[batchIndex][sampleIndex]; //expected is an integer
          expectedOutputTexture = _textures.expectedClassificationOutputs[_expectedClassIndex];
          deltaMask = _textures.classificationDeltaMask;
          break;

        case 'identification':
          expectedOutputTexture = that.draw_identificationExpectedOutput(batchIndex, sampleIndex); //expected is a texture, and we need to draw it
          break;
      } //end switch spec.problem

      // draw the input:
      that.draw_input(batchIndex, sampleIndex);
      
      _lastGeneratedSample = {
        expected: expectedOutputTexture,
        expectedClassIndex: _expectedClassIndex,
        input: _textures.input,
        deltaMask: deltaMask
      }

      return _lastGeneratedSample;
    },


    get_testsCount: function(){
      return _testsCount;
    },


    generate_testSample: function(backgroundTexture, testSampleIndex){ 
      const batchIndex = Math.floor(testSampleIndex / _nSamplesPerBatch);
      const sampleIndex = testSampleIndex - (batchIndex * _nSamplesPerBatch);
      const testSample = that.generate_sample(null, true, batchIndex, sampleIndex);
      return testSample;
    },


    needs_testSubstractExpectedTexture: false,
    evaluate_test: function(NNResult){
      let isSuccess = false;
      let error = 0;

      switch (_spec.problem){
        case 'classification':
          let probaMax = -Infinity, indexMax = -1;
          NNResult.forEach(function(resultClass, classIndex) {
            const proba = (resultClass[0] + resultClass[1] + resultClass[2] + resultClass[3]) / 4;
            if (proba > probaMax) {
              indexMax = classIndex;
              probaMax = proba;
            }
          }); //end classes loop
          
          isSuccess = (indexMax === _expectedClassIndex);
          error = -Infinity;
          break;

        case 'identification':
          let sum = 0, denom = 0;
          NNResult.forEach(function(resultVar, resultVarI) {
            denom += 4;
            for (let c = 0; c < 4; ++c) { //RGBA loop
              const a = Math.abs(resultVar[c]); //2018-05-30 : do not know if true or not...
              sum += (a > 1e20) ? 0 : a;
            } //end for color
          }); //end result.forEach

          isSuccess = (denom !== 0);
          error = (isSuccess) ? (sum / denom) : -Infinity;
          break;
      } //end switch(_spec.problem)

      return {
        isConsider: true,
        success: isSuccess,
        error: error
      };
    },


    can_displayGraphIdent: function(){
      return (_spec.problem === 'identification');
    },


    can_displayGraphClass: function(){
      return (_spec.problem === 'classification');
    },


    get_evaluationType: function(){
      return {
        classification: 'MAXSUCCESSRATE',
        'identification': 'MINERROR'
      }[_spec.problem];
    }
    

    //PRECOMPILER_BEGINDELETE
    ,get_displayableTextures: function(){
      const displayableTextures = [{
        name: 'input',
        texture: _textures.input
      }, {
        name: 'expected output',
        texture: function(){
          return _lastGeneratedSample.expected;
        }
      }];
      if (_spec.problem === 'classification'){
        displayableTextures.push({
          name: 'deltaMask',
          texture: _textures.classificationDeltaMask
        },{
          name: '1st expected',
          texture: _textures.expectedClassificationOutputs[0]
        },{
          name: 'last expected',
          texture: _textures.expectedClassificationOutputs[_classesCount - 1]
        });
      }

      return displayableTextures;
    }
    //PRECOMPILER_ENDDELETE
  }; //end that

  return that;
})(); 
