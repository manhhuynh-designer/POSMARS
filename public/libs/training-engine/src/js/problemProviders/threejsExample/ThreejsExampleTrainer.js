/*
 This script provides a quickstart to write your own THREE.js based problem implementation
 It just train to distinguish a sphere from a cube

 The WebGL context is shared between THREE.js and NNGL
 It requires:
  - THREE.js
  - THREE.EffectComposer


 */ 

window['PROBLEMPROVIDERS']['ThreejsExampleTrainer'] = (function(){
  // settings provided by the training script (problem.options):
  const _defaultSpec = {
    // auto added specs:
    glContext: null,
    onload: null,

    // problem options:
    // generation:
    translationScalingFactors: [0.1, 0.1, 0.1], // max 2D translation relative amplitudes
    positiveProbability: 0.8,
    fovRange: [30, 60], // in degrees
    renderWidth: 256,
    cameraDistance: 20,
    objectScale: 5,
    cameraDistanceFov: 40, // the camera distance is given for this specific FoV

    // testing:
    detectedObjScoreMin: 0.5,
    
    // debugging:
    debugForceDxys: false,//[0.2, 0.2, 0.2]
  };

  // THREE.js instances:
  const _three = {
    renderer: null,
    composer: null,
    scene: null,
    camera: null,
    cubeMesh: null,
    sphereMesh: null,
    drawnObjects: []
  };

  let _spec = null;

  // IO textures:
  const _textures = {
    render: null,
    input: null,
    expected: null,
    deltaMask: null,
    clampMask: null
  };

  const _dims = {
    outputWidth: -1,
    inputWidth: -1,
    renderWidth: -1,
    s0: -1
  };

  const _drawState = {
    isDrawn: false,
    objectIndex: -1,
    dx: 0,
    dy: 0,
    ds: 0
  };

  const _d2r = Math.PI / 180; // degrees to radians

  let _deltaMaskArr = null, _expectedArr = null, _clampMaskArr = null;


  function init_three(){
    // instantiate the renderer:
    _three.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      context: _spec.glContext,
    });
    _three.renderer.setSize( _dims.renderWidth, _dims.renderWidth );
    _three.renderer.autoClear = false;

    // improve WebGLRenderer settings:
    //_three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    //_three.renderer.outputEncoding = THREE.sRGBEncoding;

     // build the scene:
    _three.scene = new THREE.Scene();

    // camera:
    _three.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000 );

    // add postprocessing:
    const threeRenderTarget = new THREE.WebGLRenderTarget(
      _dims.renderWidth, _dims.renderWidth,
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
    );
    _three.renderer.setRenderTarget(threeRenderTarget);
    _three.composer = new THREE.EffectComposer(_three.renderer, threeRenderTarget);

    // rendering pass:
    const threeRenderPass = new THREE.RenderPass( _three.scene, _three.camera );
    _three.composer.addPass(threeRenderPass );

    // post processing pass (copy):
    const postprocessingPass =  new THREE.ShaderPass( THREE.CopyShader );
     postprocessingPass.renderToScreen = false;
    _three.composer.addPass(  postprocessingPass );

    // build sphere and cube:
    const mat = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
    _three.cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);
    _three.sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), mat);

  } // end init_three()


  function init_textures(){
    _textures.render = Texture.instance({
      'isFloat': false,
      'isLinear': true,
      'width': _dims.renderWidth,
      'isPot': false
    });
    _textures.input = Texture.instance({
      'isFloat': false,
      'isLinear': true,
      'isMipmap': true,
      'width': _dims.inputWidth
    });
    _textures.expected = Texture.instance({
      'isFloat': true,
      'width': _dims.outputWidth,
      'array': _expectedArr
    });
    _textures.deltaMask = Texture.instance({
      'isFloat': false,
      'width': _dims.outputWidth,
      'array': _deltaMaskArr
    });
    _textures.clampMask = Texture.instance({
      'isFloat': false,
      'width': _dims.outputWidth,
      'array': _clampMaskArr
    });
  }


  function compute_outputSize(){
    return 4;
  }


  function empty_threeScene(){
    _three.drawnObjects.forEach(function(threeObject){
      _three.scene.remove(threeObject);
    });
    _three.drawnObjects.splice(0);
  }


  function pick_drawState(){
    _drawState.isDrawn = (Math.random() <= _spec.positiveProbability);
    
    if (_drawState.isDrawn){
      _drawState.objectIndex = lib_random.get_int(2);
      _drawState.dx = lib_random.get_random1_1() * _spec.translationScalingFactors[0];
      _drawState.dy = lib_random.get_random1_1() * _spec.translationScalingFactors[1];
      _drawState.ds = lib_random.get_random1_1() * _spec.translationScalingFactors[2];

      if (_spec.debugForceDxys){
        _drawState.dx = _spec.debugForceDxys[0];
        _drawState.dy = _spec.debugForceDxys[1];
        _drawState.ds = _spec.debugForceDxys[2];
      }
    } else {
      _drawState.objectIndex = -1;
      _drawState.dx = 0;
      _drawState.dy = 0;
      _drawState.ds = 0;
    }
  }


  function add_threeObject(threeObject){
    _three.scene.add(threeObject);
    _three.drawnObjects.push(threeObject);
  }


  function prepare_glContext(){
    FBO.unbind();
    Shaders.unset();
    Texture.reset();
  }


  function restore_glContext(){
    Shaders.enable_vertexAttrib0();
    GL.disable(GL.BLEND);
    Shaders.unset();
    Texture.reset();
    VBO.bind_quad();
    FBO.bind_default();
  }


  function set_camera(){
    // set FoV:
    const fov = lib_random.get_floatInRange(_spec.fovRange);
    _three.camera.fov = fov;
    _three.camera.updateProjectionMatrix();

    // compute position so that zoom is constant at Z = 0:
    distanceFovFactor = Math.tan(_spec.cameraDistanceFov *_d2r / 2) / Math.tan(fov * _d2r / 2);
    const cameraDistance = _spec.cameraDistance * distanceFovFactor;
    _three.camera.position.set(0, 0, cameraDistance);
  }


  function build_threeScene(){
    if (!_drawState.isDrawn){
      return;
    }

    const drawnObject = [_three.sphereMesh, _three.cubeMesh][_drawState.objectIndex];

    // scale object:
    const scale = _spec.objectScale;
    drawnObject.scale.set(scale, scale, scale);

    add_threeObject(drawnObject);
  }


  function render_threeScene(){
    GL.viewport(0, 0, _dims.renderWidth, _dims.renderWidth);
    _three.renderer.state.reset();
    
    _three.composer.resetRenderBuffersOrder();
    _three.composer.render();
    _textures.render.set_glTexture(_three.renderer.properties.get(_three.composer.renderer.getRenderTarget().texture).__webglTexture);
    
    FBO.bind_default();
    Texture.unbind(0);
  }


  function fill_outputArr(x, y, v, shouldClamp){
    if (isNaN(v)){
      throw new Error('Error in fill_outputArr(): NaN value');
    }
    //const yInv = _dims.outputWidth - 1 - y;

    // pixel index:
    const iPix = y * _dims.outputWidth + x;
    
    fill_RGBA(_expectedArr, iPix, v);
    fill_RGBA(_deltaMaskArr, iPix, 255);
    if (shouldClamp){
      fill_RGBA(_clampMaskArr, iPix, 255);
    }
  }


  function fill_RGBA(arr, iPix, v){
    arr[4*iPix]     = v; // R
    arr[4*iPix + 1] = v; // G
    arr[4*iPix + 2] = v; // B
    arr[4*iPix + 3] = v; // A
  }


  function build_expectedOutput(){
    // output format:
    // isDrawn,  dx,     dy,  ds
    // isSphere, isCube
    
    // reset output and deltaMask
    const nOut = _expectedArr.length;
    for (let i=0; i<nOut; ++i){
      _expectedArr[i] = 0;
      _deltaMaskArr[i] = 0;
      _clampMaskArr[i] = 0;
    }

    // here:
    fill_outputArr(0, 0, (_drawState.isDrawn) ? 1 : -1, true);

    if (_drawState.isDrawn){
      const dxNormalized = _drawState.dx / _spec.translationScalingFactors[0]; // between -1 and 1
      const dyNormalized = _drawState.dy / _spec.translationScalingFactors[1]; // between -1 and 1
      const dsNormalized = _drawState.ds / _spec.translationScalingFactors[2]; // between -1 and 1

      fill_outputArr(1, 0, dxNormalized, false);
      fill_outputArr(2, 0, dyNormalized, false);
      fill_outputArr(3, 0, dsNormalized, false);
      
      const isSphere = (_drawState.objectIndex === 0);
      const isCube = (_drawState.objectIndex === 1);
      
      fill_outputArr(0, 1, (isSphere) ? 1 : -1, true);
      fill_outputArr(1, 1, (isCube) ? 1 : -1, true);
    }

    // update textures from arrays;
    _textures.expected.update();
    _textures.deltaMask.update();
    _textures.clampMask.update();
  }


  function transform2D_renderTexture(backgroundTexture){
    _textures.input.set_asRenderTargetVp();
    
    VBO.bind_quad();
      
    // draw background:
    if (backgroundTexture){
      Shaders.set('shp_copy');
      GL.enable(GL.BLEND);
      GL.clearColor(0, 0, 0, 0);
      GL.clear(GL.COLOR_BUFFER_BIT);
      GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
      backgroundTexture.bind_toSampler(0);
      VBO.draw_quad(true);
    }

    // draw render texture:
    if (_drawState.isDrawn){
      Shaders.set('shp_ARcutArea');
      _textures.render.bind_toSampler(0);
      Shaders.set_uniformDynamic2f('uun_dxy', _drawState.dx, _drawState.dy);
      Shaders.set_uniformDynamic1f('uun_ds', _drawState.ds);
      Shaders.set_uniformDynamic1f('uun_s0', _dims.s0);
      VBO.draw_quad(true);
    } //end if drawedObject

    GL.disable(GL.BLEND);
  }


  function extract_fromNNResult(NNresult, x, y){
    const iPix = x + y*_dims.outputWidth;
    const rgba = NNresult[iPix];
    const mean = (rgba[0] + rgba[1] + rgba[2] + rgba[3]) / 4;
    return mean;
  }



  const that = {
    init: function(spec){
      _spec = Object.assign({}, _defaultSpec, spec);

      if (_spec.debugForceDxys){
        console.log('WARNING in ThreejsExampleTrainer: dx,dy,ds values are forced by debugForceDxys flag');
      }

      _dims.outputWidth = compute_outputSize();
      _dims.inputWidth = _spec.renderWidth;

      // compute real renderWidth and post 2D transform scale:
      const dxyMax = Math.max(_spec.translationScalingFactors[0], _spec.translationScalingFactors[1]);
      _dims.renderWidth = Math.round(_dims.inputWidth*(1+_spec.translationScalingFactors[2])*(1+dxyMax));
      _dims.s0 = _dims.inputWidth / _dims.renderWidth;

      const nOut = _dims.outputWidth * _dims.outputWidth * 4;
      _deltaMaskArr = new Uint8Array(nOut);
      _clampMaskArr = new Uint8Array(nOut);
      _expectedArr  = new Float32Array(nOut);

      init_textures();
      init_three();

      _spec.onload();
    },


    generate_sample: function(backgroundTexture, isTest){ // used by Trainer, standardized
      // clean the THREE.js scene:
      empty_threeScene();

      pick_drawState();

      // prepare context for THREE.js drawing:
      prepare_glContext();

      // set camera:
      set_camera();

      // build three.js scene:
      build_threeScene();

      // render three.js scene to _textures.render:
      render_threeScene();

      // translate _textures.render to be able to do tracking:
      // the output is in _textures.input
      transform2D_renderTexture(backgroundTexture);
      
      // construct expected output and delta mask:
      build_expectedOutput();

      // restore context:
      restore_glContext();

      // generate input texture mipmaps level
      // otherwise sampling is bad:
      _textures.input.bind_toSampler(0);
      _textures.input.generate_mipmap();
      Texture.reset();

      const infos = {};

      return ({
        infos: infos,
        input: _textures.input,
        expected: _textures.expected,
        deltaMask: _textures.deltaMask,
        clampMask: _textures.clampMask
      });
    },


    generate_testSample: function(backgroundTexture, testSampleIndex){ // used by the Trainer, standardized
      const testSample = that.generate_sample(backgroundTexture, true);
      return testSample;
    },


    get_evaluationType: function(){
      return 'MAXSUCCESSRATE';
    },


    // evaluate how good is a test:
    evaluate_test: function(NNresult){
      let isSuccess = true;

      const isDrawn = ( extract_fromNNResult(NNresult, 0, 0) > _spec.detectedObjScoreMin);

      if ( (!isDrawn &&  _drawState.isDrawn)
        || (isDrawn  && !_drawState.isDrawn)){
          isSuccess = false;
        }

      if (isSuccess){
        const sphereCoeff = extract_fromNNResult(NNresult, 1, 0);
        const cubeCoeff = extract_fromNNResult(NNresult, 1, 1);
        const objectIndex = (sphereCoeff > cubeCoeff) ? 0 : 1;
        isSuccess = ( objectIndex === _drawState.objectIndex );
      }

      return {
        isConsider: true,
        success: isSuccess,
        error: -Infinity // do not consider error
      }
    },


    get_backgroundWidth: function(){
      return _dims.inputWidth;
    },


    get_exportData: function(){
      const exportData = {
        'translationScalingFactors': _spec.translationScalingFactors
      };
      return exportData;
    }


    //PRECOMPILER_BEGINDELETE
    // return textures which are displayed in the NNGL UI:
    ,get_displayableTextures: function(){
      const displayableTextures = [
        {
          texture: function(){ return _textures.input; },
          name: 'input',
          renderingMode: 'color'
        },
        {
          texture: function(){ return _textures.render; },
          name: 'render',
          renderingMode: 'color'
        },
        {
          texture: function(){ return _textures.expected; },
          name: 'expected'
        },
        {
          texture: function(){ return _textures.deltaMask; },
          name: 'deltaMask'
        },
        {
          texture: function(){ return _textures.clampMask; },
          name: 'clampMask'
        }
      ];
      return displayableTextures;
    }
    //PRECOMPILER_ENDDELETE

  }; //end that
  return that;
})();
