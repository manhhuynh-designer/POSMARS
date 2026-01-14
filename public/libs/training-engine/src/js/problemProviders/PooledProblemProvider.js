const PooledProblemProvider = (function(){

  // get arguments (provided in the training script):
  const __defaultSpec = {
    'size': 100,
    'usageCount': 10
  };

  return {
    instance: function(problemProvider, spec){
      if (!spec){
        return problemProvider;
      }

      const _spec = Object.assign({}, __defaultSpec, spec);
      const _samples = [];
      let _lastSample = null, _lastSourceSample = null;
      //window.pooled = _samples;

      for (let i=0; i<_spec['size']; ++i){
        _samples.push({
          usageCounter: 0,
          sample: null
        });
      }


      function clone_sample(sample){
        return {
          infos: Object.assign({}, sample.infos),
          input: sample.input.clone(),
          expected: sample.expected.clone(),
          expectedClassIndex: sample.expectedClassIndex || 0,
          deltaMask: sample.deltaMask.clone(),
          clampMask: (sample.clampMask) ? sample.clampMask.clone() : null
        };
      }


      function copy_texture(srcTexture, dstTexture){
        if (!srcTexture){
          debugger;
          return null;
        }
        dstTexture.copy(srcTexture);
      }


      function copy_sample(src, dst){
        Object.assign(dst.infos, src.infos);
        copy_texture(src.input, dst.input);
        copy_texture(src.expected, dst.expected);
        copy_texture(src.deltaMask, dst.deltaMask);
        dst.expectedClassIndex = src.expectedClassIndex || 0;
        if (src.clampMask){
          copy_texture(src.clampMask, dst.clampMask);
        }
      }


      const that = {
        isPooled: true,

        generate_sample(backgroundTexture, isTest){
          const cachedSample = lib_array.pick_random(_samples);
          if (cachedSample.sample === null || cachedSample.usageCounter >= _spec['usageCount']){
            const sample = problemProvider.generate_sample(backgroundTexture, isTest);
            _lastSourceSample = sample;
            if (cachedSample.sample === null){
              cachedSample.sample = clone_sample(sample);
            } else {
              copy_sample(sample, cachedSample.sample);
            }

            const inputTextureCached = cachedSample.sample.input;
            if (inputTextureCached.is_mipmapped()){
              inputTextureCached.bind_toSampler(0);
              inputTextureCached.generate_mipmap();
            }
            Texture.reset();

            cachedSample.usageCounter = 0;
          }

          ++cachedSample.usageCounter;
          _lastSample = cachedSample.sample;

          return cachedSample.sample;
        },


        get_displayableTextures(){
          return [
            {
              texture: function(){ return _lastSample.input; },
              name: 'input'
            },
            {
              texture: function(){ return _lastSample.input; },
              name: 'input color',
              renderingMode: 'color'
            },
            {
              texture: function(){ return _lastSourceSample.input; },
              name: 'input source color',
              renderingMode: 'color'
            },
            {
              texture: function(){ return _lastSample.expected; },
              name: 'expected'
            },
            {
              texture: function(){ return _lastSample.deltaMask; },
              name: 'deltaMask'
            },
            {
              texture: function(){ return _lastSample.clampMask; },
              name: 'clampMask'
            }
          ]
        }
      }
      return that;
    }// end instance
  }

})() //end PooledProblemProvider
