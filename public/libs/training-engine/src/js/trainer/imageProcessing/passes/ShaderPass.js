const ShaderPass = (function(){

  let __shadersCount = 0;
  const __fragmentShaderSources = {};

  //PRECOMPILER_BEGINNOGLSLX
  
  // HUE SHIFT:
  // see https://stackoverflow.com/questions/8507885/shift-hue-of-an-rgb-color
  __fragmentShaderSources['shiftHue'] = "\
    vec3 shiftHue(vec3 col, float H){\n\
      float U = cos(H);\n\
      float W = sin(H);\n\
      \n\
      return vec3(\n\
        (.299+.701*U+.168*W)*col.r\n\
        + (.587-.587*U+.330*W)*col.g\n\
        + (.114-.114*U-.497*W)*col.b,\n\
        (.299-.299*U-.328*W)*col.r\n\
        + (.587+.413*U+.035*W)*col.g\n\
        + (.114-.114*U+.292*W)*col.b,\n\
        (.299-.3*U+1.25*W)*col.r\n\
        + (.587-.588*U-1.05*W)*col.g\n\
        + (.114+.886*U-.203*W)*col.b);\n\
    }\n\
    void main(){\n\
      vec4 color = texture2D( uun_source, vUV );\n\
      float angleShift = (2.0*uun_rand.x-1.0) * angleMaxRad;\n\
      gl_FragColor = vec4(shiftHue(color.rgb, angleShift), color.a);\n\
    }";

  // COLOR INVERSION:
  __fragmentShaderSources['invertColors'] = "\
    void main(){\n\
      vec4 color = texture2D( uun_source, vUV );\n\
      vec3 colorInv = vec3(1.,1.,1.) - color.rgb;\n\
      gl_FragColor = vec4(colorInv, color.a);\n\
    }";

  // GAMMA TWEAKING:
  __fragmentShaderSources['shiftGamma'] = "\
    void main(){\n\
      vec4 color = texture2D( uun_source, vUV );\n\
      float gammaShift = gammaShiftRange.x + (gammaShiftRange.y - gammaShiftRange.x) * uun_rand.x;\n\
      vec3 colorGammaChanged = pow(color.rgb, vec3(1.,1.,1.) * (1.0 + gammaShift));\n\
      gl_FragColor = vec4(colorGammaChanged, color.a);\n\
    }";

  // LUMINOSITY TWEAKING:
  __fragmentShaderSources['shiftLuminosity'] = "\
    void main(){\n\
      vec4 color = texture2D( uun_source, vUV );\n\
      float luminosityShift = luminosityShiftRange.x + (luminosityShiftRange.y - luminosityShiftRange.x) * uun_rand.x;\n\
      vec3 colorLuminosityChanged = color.rgb * luminosityShift;\n\
      gl_FragColor = vec4(colorLuminosityChanged, color.a);\n\
    }";

  //PRECOMPILER_ENDNOGLSLX


  function format_uniforms(specUniforms, width){
    // add built-in uniforms:
    specUniforms['uun_dxy'] = [ 1/width, 1/width ];
    specUniforms['uun_rand'] = [0, 0, 0, 0];

    // init output:
    const uniforms = {
      names: [],
      values: [],
      source: 'varying vec2 vUV;\n'
    };    

    // create output:
    for (let uniformName in specUniforms){
      uniforms.names.push(uniformName);
      const uniformValue = specUniforms[uniformName];

      // get uniform type:
      let GLSLType = null, type = null;
      if (typeof(uniformValue) === 'number'){
        type = '1f', GLSLType = 'float';
      } else if(uniformValue.length) {
        const i = uniformValue.length - 1;
        type = ['1f', '2f', '3f', '4f'][i];
        GLSLType = ['float', 'vec2', 'vec3', 'vec4'][i];
      } else {
        throw new Error('Cannot get uniform value for ' + uniformName);
      }

      uniforms.source += 'uniform ' + GLSLType + ' ' + uniformName + ';\n';
      uniforms.values.push({
        type: type,
        name: uniformName,
        value: uniformValue
      });
    }

    // add the source texture:
    uniforms.source += 'uniform sampler2D uun_source;\n';
    uniforms.names.push('uun_source');
    uniforms.values.push({
      name: 'uun_source',
      type: '1i',
      value: 0
    });

    return uniforms;
  }


  return {
    instance: function(passType, spec){
      const _spec = Object.assign({
        width: -1,
        uniforms: {}
      }, spec);

      // build output texture:
      const _outputTexture =  Texture.instance({
        'isFloat': false,
        'isLinear': true,
        'isPot': false,
        'width': _spec.width
      });

      // build shader:
      const uniforms = format_uniforms(spec.uniforms, _spec.width);

      const fragmentShaderSource = uniforms.source + __fragmentShaderSources[passType];      
      const shaderName = 'SHADERPASS '+ passType.toString().toUpperCase();
      const _shaderId = 'shp_shaderPass_' + (__shadersCount++).toString();
      const _shader = {
        name: shaderName,
        id: _shaderId,
        fragmentSource: fragmentShaderSource,
        uniformsNames: uniforms.names,
        isNoGLSLx: true
      }
      
      Shaders.add_shader(_shader, uniforms.values);

      return {
        // input is bound to texture sampler0
        // output should be bound to texture sampler0
        draw: function(){
          Shaders.set(_shaderId);
          Shaders.set_uniformDynamic4f('uun_rand', lib_random.get_random(), lib_random.get_random(), lib_random.get_random(), lib_random.get_random());
          _outputTexture.set_asRenderTargetVp();
          VBO.draw_quad(true);

          // bind to sampler0 for next pass:
          _outputTexture.bind_toSampler(0);
          return _outputTexture;
        },


        get_outputTexture: function(){
          return _outputTexture;
        }
      }
    }
  }

})();

