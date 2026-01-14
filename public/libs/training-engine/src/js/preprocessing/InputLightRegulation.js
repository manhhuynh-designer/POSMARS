 
const InputLightRegulation = (function(){
 
  return {
    /*
      spec: 
        - nBlurPass: number of passes to compute gaussian blur. default: 3
        - inputWidth: width of the input. default: 64
        - outputWidth: width of the output. default: 64
    */
    instance: function(spec) {
      const _nBlurPass = (spec.nBlurPass) ? spec.nBlurPass : 3;
      const _inputWidth = (spec.inputWidth) ? spec.inputWidth : 64;
      const _outputWidth = (spec.outputWidth) ? spec.outputWidth : 64;
      const _isTrainer = (spec.isTrainer) ? true : false;

      const textureParams = {
        'isFloat': false,
        'width': _inputWidth,
        'isPot': false,
        'isFlipY': false
      };

      const _blur0texture = Texture.instance(textureParams);
      const _blur1texture = Texture.instance(textureParams);
      const _blur02texture = Texture.instance(textureParams);
      const _blur12texture = Texture.instance(textureParams);

      const _outputTexture = Texture.instance({
        'isFloat': true,
        'width': _outputWidth,
        'isPot': false,
        'isFlipY': false
      });

      const _dx = 1.0 / _inputWidth;


      const that = {
        // the input texture must be bound to Texture unit 0
        // the output texture will be bount to the Texture unit 0
        // the default FBO should be bound to the context
        process: function(inputTexture){
          // COMPUTE THE SQUARED TEXTURE (will be usedfull to compute the variance):
          Shaders.set('shp_square')
          _blur12texture.set_asRenderTarget();
          VBO.draw_quad(_isTrainer, false);


          // FIRST STEP: 2 PASSES GAUSSIAN BLUR (= compute mean)
          Shaders.set('shp_inputLightRegBlur');
          
          for (let i=0; i<_nBlurPass; ++i){
            // horizontal blur for normal texture:
            _blur0texture.set_asRenderTarget();
            Shaders.set_uniformDynamic2f('uun_dxy', _dx, 0);
            VBO.draw_quad(_isTrainer, false);

            // horizontal blur for squared texture:
            _blur02texture.set_asRenderTarget();
            _blur12texture.bind_toSampler(0);
            VBO.draw_quad(_isTrainer, false);

            // vertical blur for normal texture:
            _blur1texture.set_asRenderTarget();
            _blur0texture.bind_toSampler(0);
            Shaders.set_uniformDynamic2f('uun_dxy', 0, _dx);
            VBO.draw_quad(_isTrainer, false);

            // vertical blur for squared texture:
            _blur12texture.set_asRenderTarget();
            _blur02texture.bind_toSampler(0);
            VBO.draw_quad(_isTrainer, false);

            if (i !== _nBlurPass - 1) {
              _blur1texture.bind_toSampler(0);
            }
          }

          // SECOND STEP: DIFFERENCE
          Shaders.set('shp_inputLightRegCompose');
          _outputTexture.set_asRenderTarget();
          inputTexture.bind_toSampler(0);
          _blur1texture.bind_toSampler(1);
          _blur12texture.bind_toSampler(2);
          VBO.draw_quad(_isTrainer, false);

          _outputTexture.bind_toSampler(0);
        }, //end process()

        get_outputTexture: function(){
          //return _blur1texture;
          //return _blur12texture;
          return _outputTexture;
        }

        //PRECOMPILER_BEGINDELETE
        ,
        get_debugTextures: function(){
          return [
          {
            name: 'mean. inpReg.',
            texture: _blur1texture
          },
          {
            name: 'mean². inpReg.',
            texture: _blur12texture
          },
          {
            name: 'out. inpReg.',
            texture: _outputTexture
          }];
        }
        //PRECOMPILER_ENDDELETE

      }; //end that
      return that;
    } //end instance()
  } //end return value
})(); //end InputLightRegulation()
