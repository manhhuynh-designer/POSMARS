/*
  Add a random blur to the input image

*/
const Blur = (function(){

  const __defaultSpec = {
    radiusRange: [1, 3], // in pixels
    width: -1,
    isFloatPrecision: false
  };
  
  return {
    instance: function(spec){     
      const _spec = Object.assign({}, __defaultSpec, spec);

      const _patchHalfSize = Math.ceil(1.5*_spec.radiusRange[1]);

      // create textures:
      const _outputTexture = Texture.instance({
        'isFloat': _spec.isFloatPrecision,
        'isLinear': true,
        'isPot': false,
        'width': _spec.width
      });

      // shader source:
      //PRECOMPILER_BEGINNOGLSLX
      const blurShaderGLSL = '\n\
      #define PATCHHALFSIZE ' + _patchHalfSize.toFixed(1) + '\n\
      uniform sampler2D uun_source;\n\
      uniform float uun_dx;\n\
      varying vec2 vUV;\n\
      \n\
      void main(void){\n\
        vec2 uv = vUV;\n\
        float sum = 0.0;\n\
        vec4 col = vec4(0.);\n\
        float gaussianSigma = PATCHHALFSIZE * 0.5;\n\
        float gaussianExpFactor = - 0.5 / pow(gaussianSigma, 2.0);\n\
        \n\
        for (float y = -PATCHHALFSIZE; y <= PATCHHALFSIZE; y += 1.0){\n\
          for (float x = -PATCHHALFSIZE; x <= PATCHHALFSIZE; x += 1.0){\n\
            vec2 dxy = vec2(x, y);\n\
            vec2 uvp = uv + uun_dx * dxy;\n\
            float isInside = step(0.0, uvp.x) * step(0.0, uvp.y) * step(uvp.x, 1.0) * step(uvp.y, 1.0);\n\
            float gaussianFactor = exp( gaussianExpFactor * dot(dxy, dxy) );\n\
            gaussianFactor *= isInside;\n\
            sum += gaussianFactor;\n\
            col += gaussianFactor * texture2D(uun_source, uvp);\n\
          }\n\
        }\n\
        gl_FragColor = col / sum;\n\
      }';
      //PRECOMPILER_ENDNOGLSLX

      // register shader;
      Shaders.add_shader({
        name: 'BLUR INPUT',
        id: 'shp_blurInput',
        fragmentSource: blurShaderGLSL,
        uniformsNames: ['uun_source', 'uun_dx'],
        isNoGLSLx: true
      }, [{
        type: '1i',
        name: 'uun_source',
        value: 0
      }]);


      const that = {
        // input is bound to texture sampler0
        // output will be bound to texture sampler0
        draw: function(blurRadiusArg){
          const blurRadius = (blurRadiusArg === undefined) ? lib_random.get_floatInRange(_spec.radiusRange) : blurRadiusArg;
          let dx = 1 / _spec.width;

          // scale the patch according to blurRadius:
          dx *= blurRadius / _patchHalfSize;

          const isBlur = (blurRadius > 0.5);

          // draw blur:
          if (!isBlur){
            // just copy
            Shaders.set('shp_copy');
          } else {
            Shaders.set('shp_blurInput');
            Shaders.set_uniformDynamic1f('uun_dx', dx);
            Texture.set_linearFiltering();
          }
          
          _outputTexture.set_asRenderTargetVp();
          VBO.draw_quad(true);

          if (isBlur){
            Texture.set_nearestFiltering();
          }

          // bind to sampler0 for next pass:
          _outputTexture.bind_toSampler(0);
          return _outputTexture;
        },


        get_outputTexture: function(){
          return _outputTexture;
        }
      }; //end that
      return that;
    } // end instance()
  } //end return
})();
