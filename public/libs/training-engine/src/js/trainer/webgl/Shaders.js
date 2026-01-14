const Shaders = (function() {
  // PRIVATE VARIABLES:
  let _currentShaderId = -1,
     _currentShader = null,
     _shaderIdCount = 0;

  let _vertexShaderDefaultSource = "$glsl/vertex/default.gl$";
  

  // PRIVATE FUNCTIONS:

  // check that there is no undefined or NaN into the arguments:
  function ensure_noUndefined(name){
    for (let i=1; i<arguments.length; ++i){
      const arg = arguments[i];
      ensure_noUndefinedVal(name, arg);
      if (arg.length){
        for (let j=0; j<arg.length; ++j){
          ensure_noUndefinedVal(name, arg[j]);
        }
      }
    }
  }


  function ensure_noUndefinedVal(name, v){
    if (v === undefined){
      throw new Error('ERROR in Shaders.js: Undefined cannot be assigned to an uniform value for ' + name);
    }
    if (typeof(v) === 'number' && isNaN(v)){
      throw new Error('ERROR in Shaders.js: NaN cannot be assigned to an uniform value for ' + name);
    }
  }


  // compile a vertex or a fragment shader:
  function compile_shader(glType, source, typeString) {
    const glShader = GL.createShader(glType);
    GL.shaderSource(glShader, source);
    GL.compileShader(glShader);
    if (!GL.getShaderParameter(glShader, GL.COMPILE_STATUS)) {
      const errorInfoLog = GL.getShaderInfoLog(glShader);
      //PRECOMPILER_BEGINDELETE
      GLDebugger.display_shaderCompilationError(errorInfoLog, source, typeString);
      return null;
      //PRECOMPILER_ENDDELETE
      throw new Error(typeString + ' Shader source = \n' + source + '\n\nERROR =\n' + errorInfoLog);
      return null;
    }
    return glShader;
  };


  // compile both shaders, build the shader program:
  function create_shaderProgram(vertexSource, fragmentSource, shaderName) {
    const glShaderVertex = compile_shader(GL.VERTEX_SHADER, vertexSource, shaderName + " VERTEX");
    const glShaderFragment = compile_shader(GL.FRAGMENT_SHADER, fragmentSource, shaderName + " FRAGMENT");

    const glShaderProgram = GL.createProgram();

    GL.attachShader(glShaderProgram, glShaderVertex);
    GL.attachShader(glShaderProgram, glShaderFragment);

    GL.linkProgram(glShaderProgram);

    //PRECOMPILER_BEGINLOG
    GL.validateProgram(glShaderProgram);

    if ( !GL.getProgramParameter( glShaderProgram, GL.LINK_STATUS) ) {
      const info = GL.getProgramInfoLog(glShaderProgram);
      throw new Error(
        'ERROR in Shader.js: cannot link shader ' + shaderName
        + 'VERTEX SOURCE = \n' + vertexSource + '\n'
        + 'FRAGMENT SOURCE = \n' + fragmentSource + '\n'
        + 'INFOS = \n' + info);
    }
    //PRECOMPILER_ENDLOG

    return glShaderProgram;
  };


  function get_GLUniformLocation(shader, uniformName){
    //PRECOMPILER_BEGINLOG
    GL.getError();
    //PRECOMPILER_ENDLOG
    const GLLocation = GL.getUniformLocation(shader.program, uniformName);
    //PRECOMPILER_BEGINLOG
    if (GL.getError() !== GL.NO_ERROR){
      throw new Error('ERROR in Shader.js: cannot find uniform ' + uniformName + ' in shader ' + shader.name);
    }
    //PRECOMPILER_ENDLOG
    return GLLocation;
  };


  function get_shaderPrecisionGLSL(precision){
    const precisionGLSL = (precision) ? precision : 'highp';
    return ['float', 'sampler2D', 'int'].map(function(typeGLSL){
      return 'precision ' + precisionGLSL + ' ' + typeGLSL + ';\n';
    }).join('');
  };


  function fetch_shaderSource(shaderSource){
    if (!shaderSource.includes('$glsl')){
      return Promise.resolve(shaderSource);
    }
    return new Promise(function(accept, reject){
      const shaderSourcePath = 'src/' + shaderSource.split('$')[1];
      fetch(shaderSourcePath, {method: 'GET'}).then(async function(response){
        const shaderSourceContent = await response.text();
        accept(shaderSourceContent);
      });
    }); //end returned promise
  }


  async function fetch_shader(shader){
    if (shader.fragmentSource){
      shader.fragmentSource = await fetch_shaderSource(shader.fragmentSource);
    }
    if (shader.vertexSource){
      shader.vertexSource = await fetch_shaderSource(shader.vertexSource);
    }
  }


  function fetch_shaders(shaders){
    const shadersFetchPromises = [];
    for (let shaderId in shaders){
      shadersFetchPromises.push(fetch_shader(shaders[shaderId]));
    }
    return Promise.all(shadersFetchPromises);
  }


  // build the shader program, link uniforms and attributes:
  function init_shader(shader) {
    // give a unique shader program id
    shader.id = shader.id || _shaderIdCount++;
    if (!('vertexSource' in shader)) {
      shader.vertexSource = _vertexShaderDefaultSource;
    }
    if (!('attributesNames' in shader)) {
      shader.attributesNames = ['aat_position'];
    }
    if (!('attributesDims' in shader)) {
      shader.attributesDims = [2];
    }
    shader.vertexSize = 0;
    shader.attributesDims.forEach(function(aDim) {
      shader.vertexSize += aDim * 4;
    });

    // add precision:
    shader.vertexSource = get_shaderPrecisionGLSL(shader.precision) + shader.vertexSource;
    shader.fragmentSource = get_shaderPrecisionGLSL(shader.precision) + shader.fragmentSource;
    
    // build shader program:
    shader.program = create_shaderProgram(shader.vertexSource, shader.fragmentSource, shader.name);

    // link uniforms:
    shader.uniforms = {};
    shader.isFloatMax = false;
    if (!shader.uniformsNames) debugger;
    shader.uniformsNames.forEach(function(uniformName) {
      shader.uniforms[uniformName] = get_GLUniformLocation(shader, uniformName);
      shader.isFloatMax = shader.isFloatMax || (uniformName === 'uun_floatMax');
    });

    // link attributes:
    shader.attributes = {};
    shader.attributesNumArray = [];
    shader.attributesNames.forEach(function(attributeName) {
      const attrib = GL.getAttribLocation(shader.program, attributeName);
      shader.attributes[attributeName] = attrib;
      shader.attributesNumArray.push(attrib);
    });

    // assign samplers:
    if (shader.samplers || shader.isFloatMax) {
      GL.useProgram(shader.program);
      _currentShader = shader;
      _currentShaderId = shader.id;
      if (shader.samplers){
        for (let uniformName in shader.samplers){
          //PRECOMPILER_BEGINDELETE
          if (typeof(shader.uniforms[uniformName]) === 'undefined'){
            throw new Error('Error in Shaders.js: Uniform ' + uniformName + ' is not linked to shader ' + shader.name);
          }
          //PRECOMPILER_ENDDELETE
          GL.uniform1i(shader.uniforms[uniformName], shader.samplers[uniformName]);
        }
      }
      if (shader.isFloatMax){
        GL.uniform1f(shader.uniforms['uun_floatMax'], 1e24);
      }
    }

    // set and unset:
    shader.set = function() {
      if (_currentShaderId === shader.id) return;
      if (_currentShaderId !== -1) {
        _currentShader.unset();
      }
      //console.log(shader.name);

      _currentShaderId = shader.id;
      _currentShader = shader;

      GL.useProgram(shader.program);
      shader.attributesNumArray.forEach(function(attrib) {
        if (attrib === 0) return;
        GL.enableVertexAttribArray(attrib);
      });
    }; //end shader.set()

    shader.unset = function() {
      _currentShaderId = -1;
      shader.attributesNumArray.forEach(function(attrib) {
        if (attrib === 0) return;
        GL.disableVertexAttribArray(attrib);
      });
    };

    shader.initialized = true;
  }; //end init_shader()


  const uLearning = ['uun_deltas', 'uun_inputs', 'uun_SGDLearningRate', 'uun_floatMax'];
  const uBp = ['uun_weightsDeltas', 'uun_inputs', 'uun_toSparsity2'];
  const uSamplerSource = {'uun_source': 0};
  const uSamplerSignal = {'uun_signal': 0};
  const uSamplerMask = {'uun_mask': 1};
  const uSamplerWeights = {'uun_inputs': 0, 'uun_weights': 1};
  const uSamplerBpCost = Object.assign({
        'uun_expectedOutput': 1,
        'uun_sigmaPrimeZ': 2,
        'uun_deltaMask': 3
      }, uSamplerSignal);
  const uSamplerBpActivation = {
        'uun_weightsDeltas': 0,
        'uun_inputs': 1
      };
  const uSamplerDeltasWeights = {
        'uun_deltas': 0,
        'uun_weights': 1
      };
  const uSamplerLearningDWeights = {
        'uun_deltas': 0,
        'uun_inputs': 1
      };
  const uSamplerFirstSecond = {
        'uun_first': 0,
        'uun_second': 1
      };
  const uMaxPooling = ['uun_outputs', 'uun_sizePx'];
  const uSamplerMaxPooling = {
        'uun_outputs': 0
      };

 
  const _shaders = {
    // draw UV as color:
    'shp_debugUV': {
      fragmentSource: "$glsl/fragment/debug/debugUV.gl$",
      uniformsNames: [],
    },

    // simply copy a texture:
    'shp_copy': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPY", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copy.gl$",
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },

    'shp_copyMask': {
      /*PRECOMPILER_BEGINLOG*/ name: 'COPYMASK', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyMask.gl$",
      uniformsNames: ['uun_source', 'uun_mask'],
      samplers: Object.assign({}, uSamplerSource, uSamplerMask)
    },

    'shp_copyMaskScale': {
      /*PRECOMPILER_BEGINLOG*/ name: 'COPYMASKSCALE', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyMaskScale.gl$",
      uniformsNames: ['uun_source', 'uun_mask', 'uun_scale'],
      samplers: Object.assign({}, uSamplerSource, uSamplerMask)
    },

    // simple copy a texture and invert Y axis:
    'copyInvy': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPY INV Y", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyInvy.gl$",
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },

    // simple copy a texture and invert X axis:
    'copyInvx': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPY INV X", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyInvx.gl$",
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },

    // copy the R channels to RGBA channels
    'shp_copyChannels': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPYCHANNELS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyChannels.gl$",
      uniformsNames: ['uun_source', 'uun_mask'],
      samplers: Object.assign({}, uSamplerSource, uSamplerMask)
    },

    // copy the R channels to RGBA channels
    'shp_copyChannelsScaled': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPYCHANNELS SCALED", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyChannelsScaled.gl$",
      uniformsNames: ['uun_source', 'uun_scale'],
      samplers: uSamplerSource
    },

    // copy and scale a texture
    'shp_copyScale': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPY SCALE", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyScale.gl$",
      uniformsNames: ['uun_signal', 'uun_scale'],
      samplers: uSamplerSignal
    },

    'shp_copyScaleOffset4': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPY SCALE OFFSET 4", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyScaleOffset4.gl$",
      uniformsNames: ['uun_signal', 'uun_scale', 'uun_offset'],
      samplers: uSamplerSignal
    },

    // used by SuperResolution and Denoising trainers
    'shp_copyRGBGrey': {
      /*PRECOMPILER_BEGINLOG*/ name: "COPY RGB GREY", /*PRECOMPILER_ENDLOG*/
      id: 'shp_copyRGBGrey',
      uniformsNames: ['uun_source'],
      fragmentSource: "$glsl/fragment/copy/copyRGBGrey.gl$",
      samplers: uSamplerSource,
      precision: 'lowp'
    },

    // display a particular RGBA channel as BW image
    'shp_displayChannel': {
      /*PRECOMPILER_BEGINLOG*/ name: "DISPLAY RGBA CHANNEL", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/display/displayChannel.gl$",
      uniformsNames: ['uun_source', 'uun_channel', 'uun_scale', 'uun_offset', 'uun_abs'],
      samplers: uSamplerSource
    },

    // display a colored image (skip alpha channel)
    'shp_displayColored': {
      /*PRECOMPILER_BEGINLOG*/ name: "DISPLAY COLORED", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/copy/copyNoAlpha.gl$",
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },

    // display one of the RGBA float channel into 1 RGBA bytes channel
    'shp_floatChannel': {
      /*PRECOMPILER_BEGINLOG*/ name: "FLOAT CHANNEL", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/output/floatChannel.gl$",
      uniformsNames: ['uun_source', 'uun_channel'],
      samplers: uSamplerSource
    },

    // clamp the output between 0 an 1 for each RGBA channel
    'shp_clampMask': {
      /*PRECOMPILER_BEGINLOG*/ name: "CLAMP MASK", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/output/clampMask.gl$",
      uniformsNames: ['uun_source', 'uun_clampRange', 'uun_mask'],
      samplers: Object.assign({'uun_mask': 1}, uSamplerSource)
    },

    // simulate a sigmoid neuron
    'shp_sigmoid': {
      /*PRECOMPILER_BEGINLOG*/ name: "SIGMOID", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/sigmoid.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },

    // simulate a relu neuron
    'shp_relu': {
      /*PRECOMPILER_BEGINLOG*/ name: "RELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/relu.gl$",
      uniformsNames: ['uun_signal', 'uun_floatMax'],
      samplers: uSamplerSignal
    },

    // ELU neuron
    'shp_elu': {
      /*PRECOMPILER_BEGINLOG*/ name: "ELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/elu.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },

    'shp_elu01': {
      /*PRECOMPILER_BEGINLOG*/ name: "ELU01", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/elu01.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },

    'shp_selu': {
      /*PRECOMPILER_BEGINLOG*/ name: "SELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/selu.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },

    'shp_gelu': {
      /*PRECOMPILER_BEGINLOG*/ name: "GELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/gelu.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },

    // simulate an arctan neuron
    'shp_arctan': {
      /*PRECOMPILER_BEGINLOG*/ name: "ARCTAN", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/arctan.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },
    'shp_arctan2': {
      /*PRECOMPILER_BEGINLOG*/ name: "ARCTAN 2", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/arctan2.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },
    'shp_arctanNormalized': {
      /*PRECOMPILER_BEGINLOG*/ name: "ARCTAN NORMALIZED", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/arctanNormalized.gl$",
      uniformsNames: ['uun_signal'],
      samplers: uSamplerSignal
    },

    // simulate a sigmoid neuron
    'shp_softplus': {
      /*PRECOMPILER_BEGINLOG*/ name: "SOFTPLUS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/softplus.gl$",
      uniformsNames: ['uun_signal', 'uun_floatMax'],
      samplers: uSamplerSignal
    },

    

    // normalize a texture by a 1px other texture value
    'shp_normalize': {
      /*PRECOMPILER_BEGINLOG*/ name: "NORMALIZE", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/activation/normalize.gl$",
      uniformsNames: ['uun_signal', 'uun_mean', 'uun_size'],
      samplers: Object.assign({'uun_mean': 1}, uSamplerSignal)
    },

    // sum the weights of the input signal for gaussian/square connected layers
    'shp_weights': {
      /*PRECOMPILER_BEGINLOG*/ name: "WEIGHTS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/weightsWithMask.gl$",
      uniformsNames: ['uun_weights', 'uun_inputs', 'uun_toIndices', 'uun_weightsMask', 'uun_floatMax'],
      samplers: Object.assign({
        'uun_toIndices': 2,
        'uun_weightsMask': 3
      }, uSamplerWeights)
    },

    // sum the weights of the input signal in case of fully connected layers
    'shp_weightsFull': {
      /*PRECOMPILER_BEGINLOG*/ name: "WEIGHTS FULL", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/weightsFull.gl$",
      uniformsNames: ['uun_weights', 'uun_inputs', 'uun_toSize', 'uun_fromSize', 'uun_floatMax', 'uun_isDebug2'],
      samplers: uSamplerWeights
    },
    'shp_weightsConv': {
      /*PRECOMPILER_BEGINLOG*/ name: "WEIGHTS CONV", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/weightsConv.gl$",
      uniformsNames: ['uun_weights', 'uun_inputs', 'uun_toSize', 'uun_kernelsCount', 'uun_toSparsity', 'uun_fromSize', 'uun_bias', 'uun_isDebug', 'uun_isDebug2', 'uun_inputScale'],
      samplers: Object.assign({'uun_bias': 2}, uSamplerWeights)
    },

    // sum the weights of the input signal in case of single connected layer
    'shp_weightsDirect': {
      /*PRECOMPILER_BEGINLOG*/ name: "WEIGHTS DIRECT",
      fragmentSource: "$glsl/fragment/feedforward/weightsDirect.gl$",
      uniformsNames: ['uun_weights', 'uun_inputs', 'uun_floatMax'],
      samplers: uSamplerWeights
    },

    // apply bias and reduce weights sum texture
    'shp_bias': {
      /*PRECOMPILER_BEGINLOG*/ name: "BIASES", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/bias.gl$",
      uniformsNames: ['uun_source', 'uun_bias', 'uun_toSparsity2', 'uun_floatMax'],
      samplers: Object.assign({
        'uun_bias': 1
      }, uSamplerSource)
    },

    // for the trainer: cut the right part of a batch
    'shp_imageTransformer': {
      /*PRECOMPILER_BEGINLOG*/ name: "IMAGE TRANSFORMER", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/trainer/imageTransform.gl$",
      uniformsNames: ['uun_signal', 'uun_sampleOffset', 'uun_sampleScale', 'uun_sampleCrop',
        'uun_offset', 'uun_brightness', 'uun_scale', 'uun_rotateMatrix', 'uun_bgColor', 'uun_aspectRatio'],
      samplers: uSamplerSignal
    },

    'shp_batchCutSimple': {
      /*PRECOMPILER_BEGINLOG*/ name: "BATCHCUT SIMPLE", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/trainer/batchCutSimple.gl$",
      uniformsNames: ['uun_signal', 'uun_offset', 'uun_scale'],
      samplers: uSamplerSignal
    },
    //PRECOMPILER_ENDTRAININGSHADERS
    
    // for the trainer: take the expected output texture and convert it to float texture
    'shp_RG_BA_8To32': {
      /*PRECOMPILER_BEGINLOG*/ name: "RG_BA_8To32", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/trainer/RG_BA_8To32.gl$",
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },

    // backpropagation cross entropy layer
    'shp_bpCrossEntropy': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION CROSS-ENTROPY", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpCrossEntropy.gl$",
      uniformsNames: ['uun_signal', 'uun_expectedOutput', 'uun_sigmaPrimeZ', 'uun_deltaMask'],
      samplers: uSamplerBpCost
    },

    // backpropagation quadratic layer
    'shp_bpQuadratic': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION QUADRATIC", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpQuadratic.gl$",
      uniformsNames: ['uun_signal', 'uun_expectedOutput', 'uun_sigmaPrimeZ', 'uun_deltaMask'],
      samplers: uSamplerBpCost
    },

    //for backpropagation copy layer
    'shp_bpCopy': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION COPY", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpCopy.gl$",
      uniformsNames: uBp,
      samplers: uSamplerBpActivation
    },

    'shp_bpSigmoid': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION SIGMOID", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpSigmoid.gl$",
      uniformsNames: uBp.concat(['uun_floatMax']),
      samplers: uSamplerBpActivation
    },

    'shp_bpRelu': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION RELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpRelu.gl$",
      uniformsNames: uBp.concat(['uun_floatMax']),
      samplers: uSamplerBpActivation
    },

    'shp_bpElu': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION ELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpElu.gl$",
      uniformsNames: uBp,
      samplers: uSamplerBpActivation
    },

    'shp_bpElu01': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION ELU 01", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpElu01.gl$",
      uniformsNames: uBp,
      samplers: uSamplerBpActivation
    },

    'shp_bpSelu': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION SELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpSelu.gl$",
      uniformsNames: uBp,
      samplers: uSamplerBpActivation
    },

    'shp_bpGelu': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION GELU", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpGelu.gl$",
      uniformsNames: uBp,
      samplers: uSamplerBpActivation
    },

    //for backpropagation arctan layer
    'shp_bpArctan': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION ARCTAN", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpArctan.gl$",
      uniformsNames: uBp.concat(['uun_floatMax']),
      samplers: uSamplerBpActivation
    },

    'shp_bpArctan2': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION ARCTAN 2", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpArctan2.gl$",
      uniformsNames: uBp.concat(['uun_floatMax']),
      samplers: uSamplerBpActivation
    },

    'shp_bpArctanNormalized': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION ARCTAN NORMALIZED", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpArctanNormalized.gl$",
      uniformsNames: uBp.concat(['uun_floatMax']),
      samplers: uSamplerBpActivation
    },

    // for backpropagation softplus layer
    'shp_bpSoftplus': {
      /*PRECOMPILER_BEGINLOG*/ name: "BACKPROPAGATION SOFTPLUS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/bpSoftplus.gl$",
      uniformsNames: uBp.concat(['uun_floatMax']),
      samplers: uSamplerBpActivation
    },

    // multiply Weights and Delta for backpropagation
    'shp_bpWeightsDeltas': {
      /*PRECOMPILER_BEGINLOG*/ name: "BP WEIGHTSDELTAS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltas.gl$",
      uniformsNames: ['uun_weights', 'uun_deltas', 'uun_fromIndices', 'uun_weightsMask'],
      samplers: {
        'uun_deltas': 0,
        'uun_fromIndices': 1,
        'uun_weights': 2,
        'uun_weightsMask': 3
      }
    },

    'shp_bpWeightsDeltasFull': {
      /*PRECOMPILER_BEGINLOG*/ name: "BP WEIGHTSDELTAS FULL", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltasFull.gl$",
      uniformsNames: ['uun_weights', 'uun_deltas', 'uun_toSize', 'uun_fromSize', 'uun_isDebug2'],
      samplers: uSamplerDeltasWeights
    },

    'shp_bpWeightsDeltasConv': {
      /*PRECOMPILER_BEGINLOG*/ name: "BP WEIGHTSDELTAS CONV", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltasConv.gl$",
      uniformsNames: ['uun_weights', 'uun_deltas', 'uun_toSize', 'uun_fromSize', 'uun_toSparsity', 'uun_kernelsCount', 'uun_isDebug', 'uun_isDebug2'],
      samplers: uSamplerDeltasWeights
    },

    'shp_bpWeightsDeltasDirect': {
      /*PRECOMPILER_BEGINLOG*/ name: "BP WEIGHTSDELTAS DIRECT", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltasDirect.gl$",
      uniformsNames: ['uun_weights', 'uun_deltas'],
      samplers: uSamplerDeltasWeights
    },

    // update weights according to deltas (obtained by BP)
    'shp_learning_computeDWeight': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING COMPUTE DWEIGHTS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_computeDWeight.gl$",
      uniformsNames: ['uun_weightsFromTo'].concat(uLearning),
      samplers: {
        'uun_deltas': 0,
        'uun_weightsFromTo': 1,
        'uun_inputs': 2
      }
    },
    'shp_learning_computeDWeightDirect': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING COMPUTE DWEIGHTS DIRECT", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_computeDWeightDirect.gl$",
      uniformsNames: uLearning,
      samplers: uSamplerLearningDWeights
    },
    'shp_learning_computeDWeightFull': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING COMPUTE DWEIGHTS FULL", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_computeDWeightFull.gl$",
      uniformsNames: ['uun_fromSize', 'uun_toSize', 'uun_learningMask'].concat(uLearning),
      samplers: Object.assign({
        'uun_learningMask': 3
      }, uSamplerLearningDWeights)
    },
    'shp_learning_addMomentum': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING ADD MOMENTUM", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_addMomentum.gl$",
      uniformsNames: ['uun_dweights', 'uun_previousDweights', 'uun_SGDMomentum', 'uun_floatMax'],
      samplers: {
        'uun_dweights': 0,
        'uun_previousDweights': 1
      }
    },

    'shp_learning_applyDWeight': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING APPLY DWEIGHTS CONSTANT", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_applyDWeight.gl$",
      uniformsNames: ['uun_weights', 'uun_dweights', /*'uun_previousDweights', */'uun_l2Decay', 'uun_floatMax'],
      samplers: {
        'uun_weights': 0,
        'uun_dweights': 1
      }
    },

    'shp_learning_computeDBias': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING COMPUTE DBIAS CONSTANT", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_computeDBias.gl$",
      uniformsNames: ['uun_deltas', 'uun_SGDLearningRate', 'uun_floatMax'],
      samplers: {'uun_deltas': 0}
    },
    
    // MISC:
    'shp_reorganize': {
      /*PRECOMPILER_BEGINLOG*/ name: 'REORGANIZE', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/misc/reorganize.gl$",
      uniformsNames: ['uun_source', 'uun_dims'],
      samplers: uSamplerSource
    },

    'shp_shiftRGBA1': {
      /*PRECOMPILER_BEGINLOG*/ name: "SHIFT RGBA 1", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/misc/shiftRGBA1.gl$",
      uniformsNames: ['uun_source', 'uun_isInv'],
      samplers: uSamplerSource
    },

    'shp_shiftRGBA2': {
      /*PRECOMPILER_BEGINLOG*/ name: "SHIFT RGBA 2", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/misc/shiftRGBA2.gl$",
      uniformsNames: ['uun_source', 'uun_isInv'],
      samplers: uSamplerSource
    },

    // MATHS:
    'shp_add': {
      /*PRECOMPILER_BEGINLOG*/ name: "ADD", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maths/add.gl$",
      uniformsNames: ['uun_first', 'uun_second'],
      samplers: uSamplerFirstSecond
    },
    'shp_diff': {
      /*PRECOMPILER_BEGINLOG*/ name: "DIFF", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maths/diff.gl$",
      uniformsNames: ['uun_first', 'uun_second'],
      samplers: uSamplerFirstSecond
    },
    'shp_diffAbs': {
      /*PRECOMPILER_BEGINLOG*/ name: "DIFF ABS", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maths/diffAbs.gl$",
      uniformsNames: ['uun_first', 'uun_second'],
      samplers: uSamplerFirstSecond
    },
    'shp_mult': {
      /*PRECOMPILER_BEGINLOG*/ name: "MULTIPLY TEXTURES", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maths/mult.gl$",
      uniformsNames: ['uun_first', 'uun_second', 'uun_alpha', 'uun_floatMax'],
      samplers: uSamplerFirstSecond
    },
    'shp_square': {
      /*PRECOMPILER_BEGINLOG*/ name: 'SQUARE', /*PRECOMPILER_ENDLOG*/
      fragmentSource: '$glsl/fragment/maths/square.gl$',
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },
    

    // PREPROCESSING:

    //grayScale
    'shp_grayScale': {
      /*PRECOMPILER_BEGINLOG*/ name: 'GRAYSCALE', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/preprocessing/grayScale.gl$",
      uniformsNames: ['uun_source'],
      samplers: uSamplerSource
    },

    'shp_grayScaleTilt': {
      /*PRECOMPILER_BEGINLOG*/ name: 'GRAYSCALETILT', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/preprocessing/grayScaleTilt.gl$",
      uniformsNames: ['uun_source', 'uun_tilt'],
      samplers: uSamplerSource
    },

    'shp_rgbGrayTilt': {
      /*PRECOMPILER_BEGINLOG*/ name: 'RGBGRAYTILT', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/preprocessing/rgbGrayTilt.gl$",
      uniformsNames: ['uun_source', 'uun_tilt'],
      samplers: uSamplerSource
    },

    'shp_rgbDiffGrayTilt': {
      /*PRECOMPILER_BEGINLOG*/ name: 'RGBDIFFGRAYTILT', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/preprocessing/rgbDiffGrayTilt.gl$",
      uniformsNames: ['uun_source', 'uun_tilt'],
      samplers: uSamplerSource
    },

    // sobel edge detect effect
    'shp_sobel': {
      /*PRECOMPILER_BEGINLOG*/ name: 'SOBEL', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/preprocessing/sobel.gl$",
      uniformsNames: ['uun_source', 'uun_mask', 'uun_ds'],
      samplers: Object.assign({}, uSamplerSource, uSamplerMask)
    },

    // do x-<x> when <x> is an arithmetic Gaussian mean
    'shp_meanNormalization': {
      /*PRECOMPILER_BEGINLOG*/ name: 'MEAN NORMALIZATION', /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/preprocessing/meanNormalization.gl$",
      uniformsNames: ['uun_source', 'uun_mask', 'uun_ds'],
      samplers: Object.assign({}, uSamplerSource, uSamplerMask)
    },

    // MAX POOLING:
    'shp_maxPooling2':  {
      /*PRECOMPILER_BEGINLOG*/ name: "MAX POOLING 2", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maxPooling/maxPooling2.gl$",
      uniformsNames: uMaxPooling,
      samplers: uSamplerMaxPooling
    },

    'shp_maxPooling4':  {
      /*PRECOMPILER_BEGINLOG*/ name: "MAX POOLING 4", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maxPooling/maxPooling4.gl$",
      uniformsNames: uMaxPooling,
      samplers: uSamplerMaxPooling
    },

    'shp_maxPooling2Mask':  {
      /*PRECOMPILER_BEGINLOG*/ name: "MAX POOLING 2 MASK", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maxPooling/maxPooling2Mask.gl$",
      uniformsNames: uMaxPooling,
      samplers: uSamplerMaxPooling
    },

    'shp_maxPooling4Mask':  {
      /*PRECOMPILER_BEGINLOG*/ name: "MAX POOLING 4 MASK", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/maxPooling/maxPooling4Mask.gl$",
      uniformsNames: uMaxPooling,
      samplers: uSamplerMaxPooling
    },

    // INPUT LIGHT REGULATION:
    'shp_inputLightRegBlur': {
      /*PRECOMPILER_BEGINLOG*/ name: 'INPUT LIGHT REG BLUR', /*PRECOMPILER_ENDLOG*/
      fragmentSource: '$glsl/fragment/inputLightReg/blur.gl$',
      uniformsNames: ['uun_dxy', 'uun_source'],
      samplers: uSamplerSource,
      precision: 'lowp'
    },

    'shp_inputLightRegCompose': {
      /*PRECOMPILER_BEGINLOG*/ name: 'INPUT LIGHT REG COMPOSE', /*PRECOMPILER_ENDLOG*/
      fragmentSource: '$glsl/fragment/inputLightReg/compose.gl$',
      uniformsNames: ['uun_source', 'uun_mean', 'uun_squaresMean'],
      samplers: Object.assign({
        'uun_mean': 1,
        'uun_squaresMean': 2
      }, uSamplerSource)
      //,precision: 'lowp'
    },
    //PRECOMPILER_ENDTRAININGSHADERS

    // AR:
    'shp_ARcutArea': {
      /*PRECOMPILER_BEGINLOG*/ name: 'AR CUT AREA', /*PRECOMPILER_ENDLOG*/
      fragmentSource: '$glsl/fragment/AR/cutArea.gl$',
      uniformsNames: ['uun_source', 'uun_dxy', 'uun_ds', 'uun_s0'],
      samplers: uSamplerSource,
      precision: 'lowp'
    }
  }; //end _shaders[]


  const _shadersOnDemand = {
    //PRECOMPILER_BEGINTRAININGSHADERS
    
    // CONVOLUTIONNAL SHADERS:
    'shp_learning_computeDWeightConv': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING COMPUTE DWEIGHTS CONV", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_computeDWeightConv.gl$",
      uniformsNames: ['uun_deltas', 'uun_inputs', 'uun_SGDLearningRate',
              'uun_fromSize', 'uun_toSize', 'uun_kernelsCount', 'uun_toSparsity', 'uun_floatMax', 'uun_isDebug'],
      replaces: ['1.1111'] //['#kernelClusterSize#']
    },
    'shp_learning_computeDBiasConv': {
      /*PRECOMPILER_BEGINLOG*/ name: "LEARNING COMPUTE DBIASES CONV", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/learningConstant/learning_computeDBiasConv.gl$",
      uniformsNames: ['uun_deltas', 'uun_SGDLearningRate',
              'uun_fromSize', 'uun_toSize', 'uun_kernelsCount', 'uun_toSparsity', 'uun_floatMax'],
      replaces: ['1.1111'] //['#kernelClusterSize#']
    },


    // SQUAREFAST CONNECTIVITY:
    'shp_sum_weightsSquareFast': {
      /*PRECOMPILER_BEGINLOG*/ name: "SUM WEIGHTS FOR SQUAREFAST CONNECTIVITY FF", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/weightsSquareFast.gl$",
      uniformsNames: ['uun_toSize', 'uun_weights', 'uun_inputs', 'uun_bias', 'uun_stride', 'uun_floatMax'],
      replaces: ['1.1111'] //['#sparsity#']
    },
    'shp_bpWeightsDeltasSquareFast':  {
      /*PRECOMPILER_BEGINLOG*/ name: "COMPUTE BACKPROP DELTA FOR SQUAREFAST CONNECTIVITY", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltasSquareFast.gl$",
      uniformsNames: ['uun_toSize', 'uun_weights', 'uun_deltas', 'uun_stride'], 
      replaces: ['1.1111'] //['#sparsity#']
    },
    'shp_sum_weightsSquareFastShrink': {
      /*PRECOMPILER_BEGINLOG*/ name: "SUM WEIGHTS FOR SQUAREFAST SHRINK CONNECTIVITY FF", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/weightsSquareFastShrink.gl$",
      uniformsNames: ['uun_toSize', 'uun_fromSize', 'uun_weights', 'uun_inputs', 'uun_bias', 'uun_stride', 'uun_floatMax'], //SHRINK: add fromSize
      replaces: ['1.1111', '2.2222'] //['#sparsity#', '#shrinkFactor#']
    },
    'shp_bpWeightsDeltasSquareFastShrink':  {
      /*PRECOMPILER_BEGINLOG*/ name: "COMPUTE BACKPROP DELTA FOR SQUAREFAST SHRINK CONNECTIVITY", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltasSquareFastShrink.gl$",
      uniformsNames: ['uun_toSize', 'uun_fromSize', 'uun_weights', 'uun_deltas', 'uun_stride'], //SHRINK: add fromSize
      replaces: ['1.1111'] //['#sparsity#']
    },


    // FULLNPOT CONNECTIVITY:
    'shp_sumWeightsFullNPoT': {
      /*PRECOMPILER_BEGINLOG*/ name: "SUM WEIGHTS FOR FULLNPOT CONNECTIVITY FF", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/feedforward/weightsFullNPoT.gl$",
      uniformsNames: ['uun_toSize', 'uun_weights', 'uun_inputs', 'uun_bias', 'uun_floatMax'],
      replaces: ['1.1111'] //['#sparsity#']
    },

    'shp_bpWeightsDeltasFullNPoT':  {
      /*PRECOMPILER_BEGINLOG*/ name: "COMPUTE BACKPROP DELTA FOR FULLNPOT CONNECTIVITY", /*PRECOMPILER_ENDLOG*/
      fragmentSource: "$glsl/fragment/backpropagation/weightsDeltasFullNPoT.gl$",
      uniformsNames: ['uun_fromSize', 'uun_weights', 'uun_deltas'], 
      replaces: ['1.1111'] //['#sparsity#']
    }
  }; //end _shadersOnDemand



  const that = {
    init: async function() {
      // replace shader sources:
      _vertexShaderDefaultSource = await fetch_shaderSource(_vertexShaderDefaultSource);
      await fetch_shaders(_shaders);
      await fetch_shaders(_shadersOnDemand);

      // compile shaders:
      for (let shaderId in _shaders) {
        //PRECOMPILER_BEGINLOG
        console.log('Shaders.js - init: init shader ', shaderId);
        //PRECOMPILER_ENDLOG
        init_shader(_shaders[shaderId]);
      }

      _shaders['shp_copy'].set();
      that.enable_vertexAttrib0();
      
      //initialize GLSL uniforms
      that.set_uniformsStatic('shp_imageTransformer', [{
        type: '1f',
        name: 'uun_bgColor',
        value: 0
      }, {
        type: '2f',
        name: 'uun_offset',
        value: [0, 0]
      }, {
        type: '1f',
        name: 'uun_brightness',
        value: 1
      }, {
        type: '2f',
        name: 'uun_scale',
        value: [1, 1]
      }, {
        type: '1f',
        name: 'uun_aspectRatio',
        value: 1
      }, {
        type: 'mat2',
        name: 'uun_rotateMatrix',
        value: [1, 0, 0, 1]
      }, {
        type: '2f',
        name: 'uun_sampleOffset',
        value: [0, 0]
      }, {
        type: '2f',
        name: 'uun_sampleScale',
        value: [1, 1]
      }]);

      const uIsNotDebug2 = [{
        type: '1f',
        name: 'uun_isDebug2',
        value: 0
      }];

      const uIsNotDebug = [{
        type: '1f',
        name: 'uun_isDebug',
        value: 0
      }].concat(uIsNotDebug2);
      that.set_uniformsStatic('shp_weightsConv', uIsNotDebug);
      that.set_uniformsStatic('shp_bpWeightsDeltasConv', uIsNotDebug);
      that.set_uniformsStatic('shp_weightsFull', uIsNotDebug2);
      that.set_uniformsStatic('shp_bpWeightsDeltasFull', uIsNotDebug2);
    },


    init_shaderOnDemand: function(shaderId, id, values) {
      if (!(shaderId in _shadersOnDemand)) {
        //PRECOMPILER_BEGINLOG
        console.log('ERROR in Shaders.js - init_shaderOnDemand: shader on demand', shaderId, ' does not exists. Exit initialization');
        //PRECOMPILER_ENDLOG
        return;
      }

      _shaders[id] = Object.create(_shadersOnDemand[shaderId]);
      _shadersOnDemand[shaderId].replaces.forEach(function(replace, index) {
        const searchExp = new RegExp(replace, 'g');
        _shaders[id].fragmentSource = _shaders[id].fragmentSource.replace(searchExp, values[index]);
      });

      init_shader(_shaders[id]);
    },


    add_shaders: function(shadersParams) {
      shadersParams.forEach(function(shaderParams){
        that.add_shader(shaderParams);
      });
    },


    add_shader: function(shader, uniforms){
      //PRECOMPILER_BEGINLOG
      console.log('INFO in Shaders.js - add_shader() - id =', shader.id);
      //PRECOMPILER_ENDLOG

      const shaderKey = shader.id;
      delete(shader.id); // will be reaffected in init_shader as an int
      _shaders[shaderKey] = shader;
      init_shader(_shaders[shaderKey]);
      if (uniforms){
        that.set_uniformsStatic(shaderKey, uniforms);
      }
    },


    enable_vertexAttrib0: function(){
      GL.enableVertexAttribArray(0);
    },


    log_current: function() {
      //PRECOMPILER_BEGINLOG
      console.log('INFO in Shaders.JS - log_current: Current SHP is ', _currentShader.name);
      //PRECOMPILER_ENDLOG
    },


    set: function(shaderId) {
      //console.log(shaderId, _shaders);
      if (!(shaderId in _shaders)) {
        //PRECOMPILER_BEGINLOG
        throw 'ERROR in Shader.js - set: unknow shader: ' + shaderId;
        //PRECOMPILER_ENDLOG
        return;
      }
      _shaders[shaderId].set();
    },


    set_vertexPointers: function() {
      let offset = 0;
      
      _currentShader.attributesNumArray.forEach(
        function(attrib, index) {
          const dim = _currentShader.attributesDims[index];
          GL.vertexAttribPointer(attrib, dim, GL.FLOAT, false, _currentShader.vertexSize, offset);
          offset += 4 * dim;
        }
      );
    },


    // change a uniform value in the drawing loop:
    set_uniformDynamic1i: function(uniformName, value) {
      ensure_noUndefined(uniformName, value);
      GL.uniform1i(_currentShader.uniforms[uniformName], value);
    },
    set_uniformDynamic1f: function(uniformName, value) {
      //console.log('INFO in Shaders.js: Set dynamic uniform1f ' + uniformName, value);
      ensure_noUndefined(uniformName, value);
      GL.uniform1f(_currentShader.uniforms[uniformName], value);
    },
    set_uniformDynamic2f: function(uniformName, value0, value1) {
      ensure_noUndefined(uniformName, value0, value1);
      GL.uniform2f(_currentShader.uniforms[uniformName], value0, value1);
    },
    set_uniformDynamic2fv: function(uniformName, value) {
      ensure_noUndefined(uniformName, value);
      GL.uniform2fv(_currentShader.uniforms[uniformName], value);
    },
    set_uniformDynamic3fv: function(uniformName, value) {
      ensure_noUndefined(uniformName, value);
      GL.uniform3fv(_currentShader.uniforms[uniformName], value);
    },
    set_uniformDynamic4fv: function(uniformName, value) {
      ensure_noUndefined(uniformName, value);
      GL.uniform4fv(_currentShader.uniforms[uniformName], value);
    },
    set_uniformDynamic4f: function(uniformName, v0, v1, v2, v3) {
      ensure_noUndefined(uniformName, v0, v1, v2, v3);
      GL.uniform4f(_currentShader.uniforms[uniformName], v0, v1, v2, v3);
    },
    set_uniformDynamicMatrix2fv: function(uniformName, value) {
      ensure_noUndefined(uniformName, value);
      GL.uniformMatrix2fv(_currentShader.uniforms[uniformName], false, value);
    },
    set_uniformDynamicMatrix4fv: function(uniformName, value) {
      ensure_noUndefined(uniformName, value);
      GL.uniformMatrix4fv(_currentShader.uniforms[uniformName], false, value);
    },

    
    unset: function() {
      if (_currentShaderId !== -1) {
        _currentShader.unset();
      }
    },


    //init uniform values
    set_uniformsStatic: function(shaderId, uniformsStaticValues) {
      that.set(shaderId);
      uniformsStaticValues.forEach(function(u) {
        ensure_noUndefined(u.name, u.value);
        switch (u.type) {
          case '4f':
            GL.uniform4fv(_currentShader.uniforms[u.name], u.value);
            break;
          case '3f':
            GL.uniform3fv(_currentShader.uniforms[u.name], u.value);
            break;
          case '2f':
            GL.uniform2fv(_currentShader.uniforms[u.name], u.value);
            break;
          case '1f':
            GL.uniform1f(_currentShader.uniforms[u.name], u.value);
            break;
          case '1i':
            GL.uniform1i(_currentShader.uniforms[u.name], u.value);
            break;
          case 'mat4':
            GL.uniformMatrix4fv(_currentShader.uniforms[u.name], false, u.value);
            break;
          case 'mat3':
            GL.uniformMatrix3fv(_currentShader.uniforms[u.name], false, u.value);
            break;
          case 'mat2':
            GL.uniformMatrix2fv(_currentShader.uniforms[u.name], false, u.value);
            break;
          default:
            //PRECOMPILER_BEGINLOG
            console.log('WARNING in Shaders - setUniformStatic: unknow uniform type: ', u.type, ' for shaderId = ', shaderId, ' uniform name = ', u.name);
            //PRECOMPILER_ENDLOG
            debugger;
        } //end switch uniform type
      }); //end loop on uniform static values
    },


    exists: function(shaderId){
      return (typeof(_shaders[shaderId])!=='undefined');
    }

  }; //end that
  return that;
})(); //end Shaders()()