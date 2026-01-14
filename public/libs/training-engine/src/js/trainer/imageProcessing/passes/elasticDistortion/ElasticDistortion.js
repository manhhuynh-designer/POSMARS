/*
 * return the Elastic distorsion processing of an input texture
 * 
 * spec: 
 *  - gl: gl context to use
 *  - cv: canvas
 * 
 * 
 */

const ElasticDistortion = (function() {

  const __defaultSpec = {
    ratio: 1,               // input aspect ratio
    width: 128,             // input width in pixels
    n: 5,                   // number of gaussian circles applieds
    radiusRange: [10, 128], // min and max radius
    displacement: 5         // max displacement in pixels
  };

  let __isInitialized = false;
  let __gl = null;


  function init_shaders(){
     Shaders.add_shader(
       {
         name: 'Elastic distortion combine',
         id: 'shp_elasticDistortionCombine',
         vertexSource: "attribute vec2 aat_position; varying vec2 vUV;\n\
           uniform vec2 uun_offset, uun_scale;\n\
           void main(void) {\n\
             gl_Position = vec4(aat_position * uun_scale + uun_offset, 0., 1.);\n\
             vUV = (aat_position*0.5) + vec2(0.5);\n\
           }",
         fragmentSource: "uniform sampler2D uun_image;\n\
           uniform vec2 uun_dxy;\n\
           varying vec2 vUV;\n\
           \n\
           void main(void) {\n\
             float gauss = texture2D(uun_image, vUV).r;\n\
             gl_FragColor = vec4(gauss*uun_dxy, 0., gauss);\n\
           } ",
         uniformsNames: ['uun_image', 'uun_offset', 'uun_scale', 'uun_dxy'],
       }, 
       [{
         type: '1i',
         name: 'uun_image',
         value: 1
       }]);

     Shaders.add_shader(
       {
         name: 'Elastic distortion displace',
         id: 'shp_elasticDistortionDisplace',
         fragmentSource: "uniform sampler2D uun_source, uun_displacement;\n\
           uniform vec2 uun_dxy;\n\
           varying vec2 vUV;\n\
           \n\
           void main(void) {\n\
             vec2 duv = texture2D(uun_displacement, vUV).rg * uun_dxy;\n\
             gl_FragColor = texture2D(uun_source, vUV + duv);\n\
           }",
         uniformsNames: ['uun_source', 'uun_displacement', 'uun_dxy']
       }, 
       [{
         type: '1i',
         name: 'uun_source',
         value: 0
       },{
         type: '1i',
         name: 'uun_displacement',
         value: 1
       }]);

  };


  const superThat = {
    init: function(cv, gl) {
      __gl = gl;

      // register shaders:
      init_shaders();

      __isInitialized = true;
    },

    instance: function(spec){
      const _spec = Object.assign({}, __defaultSpec, spec);
      if (!__isInitialized){
        superThat.init(spec.cv, spec.gl);
      }

      const d = _spec.displacement / _spec.width;
      const _displacementAmplitude = [d, d];

      const _gaussTexture = Texture.get_gaussTexture(2 * _spec.width);
      const create_RTTTexture = function(){
        return Texture.instance({
          'isFloat': true,
          'width': _spec.width,
          'isPot': false,
          'isLinear': false
        });
      }
      const _displacementTexture = create_RTTTexture();
      const _outputTexture = create_RTTTexture();


      const that = {
        // the input texture must be bound to Texture unit 0
        // the output texture will be bound to the Texture unit 0
        draw: function() {
          FBO.bind_default();

          __gl.enable(__gl.BLEND);
          __gl.blendFunc(__gl.SRC_ALPHA, __gl.ZERO);

          // first step - create the displacement field:
          _gaussTexture.bind_toSampler(1);
          Shaders.set('shp_elasticDistortionCombine');
          _displacementTexture.set_asRenderTargetVp();

          for (let i=0; i<_spec.n; ++i){
            const scale = (Math.random() * (_spec.radiusRange[1]-_spec.radiusRange[0]) + _spec.radiusRange[0]) / _spec.width;
            const theta = Math.random() * 2 * Math.PI;
            const strength = Math.random();
            Shaders.set_uniformDynamic2f('uun_scale', scale, scale);
            Shaders.set_uniformDynamic2f('uun_offset', 2*Math.random()-1, 2*Math.random()-1);
            Shaders.set_uniformDynamic2f('uun_dxy', Math.cos(theta) * strength, Math.sin(theta) * strength);
            VBO.draw_quad(i===0);

            if (i===0){
              __gl.blendFunc(__gl.SRC_ALPHA, __gl.ONE);
            }
          }
          __gl.disable(__gl.BLEND);
          
          // second step - apply the displacement field:
          Shaders.set('shp_elasticDistortionDisplace');
          Shaders.set_uniformDynamic2fv('uun_dxy', _displacementAmplitude);
          _outputTexture.set_asRenderTargetVp();
          _displacementTexture.bind_toSampler(1);
          VBO.draw_quad(false);

          _outputTexture.bind_toSampler(0);
          return _outputTexture;
        },


        get_outputTexture: function() {
          //return _gaussTexture;
          //return _displacementTexture;
          return _outputTexture;
        }
      }; // end that
      return that;
    } // end instance()
  };//end superThat
  return superThat;
})(); //end Elastic()

