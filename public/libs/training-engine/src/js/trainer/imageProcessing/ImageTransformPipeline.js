const ImageTransformPipeline = function(passes){
  let _builtPasses = null, _passProbabilities = [];
  let _isInitialized = false;
  
  const _spec = {
    width: -1,
    trainingDataRoot: 'undef'
  };

  
  const _last = {
    inputTexture: null,
    outputTexture: null
  };


  function build_randomBackgroundPass(options){
    return new Promise(function(accept, reject){
      const randomBackgroundGen = RandomImageRenderer.instance(options, _spec.width, function(){
        accept(randomBackgroundGen);
      }, _spec.trainingDataRoot);
    }); // end returned promise
  }


  function build_elasticDistortionPass(options){
    const elasticDistortionGen = ElasticDistortion.instance(options);
    return Promise.resolve(elasticDistortionGen);
  }


  function build_blurPass(options){
    const blurGen = Blur.instance(options);
    return Promise.resolve(blurGen);
  }


  function build_shaderPass(passType, passOptions, passSpec){
    const pass = ShaderPass.instance(passType, {
      uniforms: passSpec || {},
      width: passOptions.width
    });
    return Promise.resolve(pass);
  }


  function build_pass(passSpec){
    const passOptions = (passSpec.length) ? passSpec : Object.assign({
      gl: GL,
      cv: Context.get_cv(),
      width: _spec.width
    }, passSpec['options']);

    const proba = (passSpec['probability'] === undefined) ? 1 : passSpec['probability'];
    _passProbabilities.push(proba);

    let passBuiltPromise = null;
    switch(passSpec['passType']){
      case 'shiftHue':
      case 'invertColors':
      case 'shiftGamma':
      case 'shiftLuminosity':
        passBuiltPromise = build_shaderPass(passSpec['passType'], passOptions, passSpec['options']);
        break;

      case 'drawBackgroundImage':
        passBuiltPromise = build_randomBackgroundPass(passOptions);
        break;

      case 'distortElastic':
        passBuiltPromise = build_elasticDistortionPass(passOptions);
        break;

      case 'blur':
        passBuiltPromise = build_blurPass(passOptions);
        break;

      //PRECOMPILER_BEGINLOG
      default:
        throw new Error('ERROR in ImageTransformPipeline: unknow pass type ' + passSpec['passType']);
        break;
      //PRECOMPILER_ENDLOG
    }

    //PRECOMPILER_BEGINLOG
    if (!passBuiltPromise){
      throw new Error('ERROR in ImageTransformPipeline: cannot build the pass ' + passSpec['passType']);
    }
    //PRECOMPILER_ENDLOG

    return passBuiltPromise.then(function(passBuilt){
      //PRECOMPILER_BEGINLOG
      passBuilt.debugOptions = passOptions;
      if (!passBuilt){
        console.log('INFO in ImageTransformPipeline: error pass options =', passOptions);
        throw new Error('ERROR in ImageTransformPipeline: invalid pass ' + passSpec['passType']);
      }
      //PRECOMPILER_ENDLOG
      return passBuilt;
    });
  }


  function build_passes(){
    const buildPassesPromises = passes.map(build_pass).filter(function(pass){return pass;});
    return Promise.all(buildPassesPromises);
  }


  const that = {
    init: function(spec){
      Object.assign(_spec, {
        width: 256,
        trainingDataRoot: ''
      }, spec);
      
      return build_passes().then(function(builtPasses){
        _builtPasses = builtPasses;
        _isInitialized = true;
      });
    },


    draw: function(inputTexture){
      //PRECOMPILER_BEGINLOG
      if (!_isInitialized){
        console.log('ERROR in ImageTransformPipeline: not initialized');
      }
      //PRECOMPILER_ENDLOG

      let outputTexture = inputTexture;

      // init WebGL state:
      VBO.bind_quad();
      FBO.bind_default();
      Texture.get_one().bind_toSampler(3); // mask channel

      // draw passes:
      const passesCount = _builtPasses.length;
      for (let i=0; i<passesCount; ++i){
        const passProbability = _passProbabilities[i];
        if (!lib_random.get_boolWeighted(passProbability)){
          continue;
        }        
        const pass = _builtPasses[i];
        outputTexture = pass.draw();
      }

      Texture.unbind(3);
      
      _last.inputTexture = inputTexture;
      _last.outputTexture = outputTexture;

      return outputTexture;
    }


    //PRECOMPILER_BEGINDELETE
    ,get_displayableTextures: function(){
      const passesTextures = _builtPasses.map(function(pass, passIndex){
        const passType = passes[passIndex]['passType'] || '';
        const prefix = passIndex.toString() + ' (' + passType + ') ';
        const passTextures = [{
          name: prefix + 'outpt',
          texture: pass.get_outputTexture,
          renderingMode: 'color'
        }];
        if (pass.get_displayableTextures){
          pass.get_displayableTextures().forEach(function(dTexture){
            const dTexturePrefixed = Object.assign({}, dTexture, {
              name: prefix + dTexture.name
            });
            passTextures.push(dTexturePrefixed);
          });
        }
        return passTextures;
      }).flat();
      const displayablesTextures = [{
        name: 'input',
        texture: function(){ return _last.inputTexture; },
        renderingMode: 'color'
      }].concat(passesTextures);
      displayablesTextures.push({
        name: 'output',
        texture: function(){ return _last.outputTexture; },
        renderingMode: 'color'
      });

      return displayablesTextures;
    }
    //PRECOMPILER_ENDDELETE
  }; // end that

  
  return that;
}

window['ImageTransformPipeline'] = ImageTransformPipeline;
