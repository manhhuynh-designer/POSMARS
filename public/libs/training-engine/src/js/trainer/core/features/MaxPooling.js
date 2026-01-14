const MaxPooling = (function(){
  const _defaultSpec = {
    size: -1,
    layerSize: -1,
    layerOutputSize: -1
  };

  return {
    instance: function(spec){
      if (!spec) {
        return null;
      }

      const _spec = Object.assign({}, _defaultSpec, spec);

      const _state = {
        shaderType: null,
        shaderMaskType: null,
        outputMaskTexture: null,
        outputTexture: null
      };

      _state.shaderType = 'shp_maxPooling' + _spec.size;
      _state.outputMaskTexture = Texture.instance({
        'isFloat': false,
        'isPot': false,
        'width': _spec.layerSize
      });
      _state.shaderMaskType = _state.shaderType + 'Mask';
      
      _state.outputTexture = Texture.instance({
        'isFloat': true,
        'isPot': false,
        'width': _spec.layerOutputSize
      });

      const that = {
        process_feedforward: function(outputTexture){
          // _spec.layerSize is the layer size BEFORE max pooling
          _state.outputMaskTexture.set_asRenderTarget();
          outputTexture.bind_toSampler(0);
          Shaders.set(_state.shaderMaskType);
          Shaders.set_uniformDynamic2f('uun_sizePx', _spec.layerSize, _spec.layerSize);
          VBO.draw_quad(true);

          _state.outputTexture.set_asRenderTargetVp();
          Shaders.set(_state.shaderType);
          Shaders.set_uniformDynamic2f('uun_sizePx', _spec.layerSize, _spec.layerSize);
          VBO.draw_quad(true);

          return _state.outputTexture;
        },


        get_outputMaskTexture: function(){
          return _state.outputMaskTexture;
        },


        //PRECOMPILER_BEGINDELETE
        get_displayableTextures: function(){
          return [
            {
              name: 'maxPooled',
              texture: _state.outputTexture
            }, {
              name: 'maxPoolMask',
              texture: _state.outputMaskTexture
            }];
        },
        //PRECOMPILER_ENDDELETE


        export_toJSON: function(){
          return {
            'size': _spec.size
          }
        }
      }; //end that
      return that;
    }// end instance()
  }; //end return
})(); 
