/*

Transform image.
Used both by ImageTilter and RandomImageRenderer


*/
const ImageTransformer = (function(){
  const __defaultSpec = {
    scale: [1, 1],
    offset: [0, 0],
    angleRad: 0,
    bgColor: 0,
    brightness: 1,
    flipX: false,
    flipY: false,
    sampleOffset: [0, 0],
    sampleScale: [1, 1],
    isCropSample: true,
    forcedAspectRatio: 0 // disabled
  };

  const __defaultRandomParams = {
    'scaleRange': [1, 1],
    'scalePow': 1,
    'brightnessRange': [1, 1],
    'flipY': false,
    'flipX': false,
    'rotateMaxAngle': 0,
    'translateMax': [0, 0]
  }

  return {
    instance: function(spec){
     
      let _spec = null;

      const _transform = {
        rotateMatrix: [1, 0, 0, 1],
        scale: [1, 1],
        cropSample: 1
      };
      
      function update_transform(){
        // update scale:
        _transform.scale[0] = _spec.scale[0],
        _transform.scale[1] = _spec.scale[1];
        
        if (_spec.flipY) {
          _transform.scale[0] *= -1;
        }
        if (_spec.flipX) {
          _transform.scale[1] *= -1;
        }

        // crop sample: if 1, crop sample and display background color elsewhere
        // if 0, background color is useless
        _transform.cropSample = (_spec.isCropSample) ? 1 : 0;

        // update rotation matrix:
        const c = Math.cos(_spec.angleRad),
              s = Math.sin(_spec.angleRad);
        _transform.rotateMatrix[0] = c;
        _transform.rotateMatrix[1] = s;
        _transform.rotateMatrix[2] = -s;
        _transform.rotateMatrix[3] = c;
      }

      const that = {
        reset: function(){
          _spec = Object.assign({}, __defaultSpec);
          update_transform();
        },


        set: function(transform){
          _spec = Object.assign({}, __defaultSpec, transform);
          update_transform();
        },


        update: function(transform){
          _spec = Object.assign(_spec, transform);
          update_transform();
        },


        pick_random: function(params0){
          const params = Object.assign({}, __defaultRandomParams, params0);
         
          _spec.brightness = lib_random.get_floatInRange(params['brightnessRange']);
          if (params['flipX']) {
            _spec.flipX = lib_random.get_bool();
          }
          if (params['flipY']) {
            _spec.flipY = lib_random.get_bool();
          }

          // pick random scale:
          const scale = lib_random.get_floatMinMaxPow(params['scaleRange'][0], params['scaleRange'][1], params['scalePow']);
          _spec.scale[0] = scale;
          _spec.scale[1] = scale;

          // pick random offset:
          const translateMaxRange = (typeof(params['translateMax']) === 'number') ? [params['translateMax'], params['translateMax']] : params['translateMax'];
          _spec.offset[0] = lib_random.get_random1_1() * translateMaxRange[0];
          _spec.offset[1] = lib_random.get_random1_1() * translateMaxRange[1];
      
          // pick random rotation angle:
          _spec.angleRad = lib_random.get_random1_1() * lib_maths.convert_degToRad(params['rotateMaxAngle']);
          update_transform();
        },


        draw: function(texture){
          GL.clearColor(_spec.bgColor, _spec.bgColor, _spec.bgColor, _spec.bgColor);
          GL.clear(GL.COLOR_BUFFER_BIT);

          GL.enable(GL.BLEND);
          GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
          
          Shaders.set('shp_imageTransformer');

          texture.bind_toSampler(0);

          // sample selection (in texture atlas):
          Shaders.set_uniformDynamic2fv('uun_sampleOffset', _spec.sampleOffset);
          Shaders.set_uniformDynamic2fv('uun_sampleScale', _spec.sampleScale);
          Shaders.set_uniformDynamic1f('uun_sampleCrop', _transform.cropSample);

          const aspectRatio = (_spec.forcedAspectRatio) ? _spec.forcedAspectRatio : texture.get_aspectRatio();
          Shaders.set_uniformDynamic1f('uun_aspectRatio', aspectRatio);

          // transform:
          Shaders.set_uniformDynamic2fv('uun_offset', _spec.offset);
          Shaders.set_uniformDynamic2fv('uun_scale', _transform.scale);
          Shaders.set_uniformDynamicMatrix2fv('uun_rotateMatrix', _transform.rotateMatrix);
          Shaders.set_uniformDynamic1f('uun_brightness', _spec.brightness);
          Shaders.set_uniformDynamic1f('uun_bgColor', _spec.bgColor);          

          //VBO.bind_quad();
          VBO.draw_quad(true);

          GL.disable(GL.BLEND);
        } //end draw()
      }; //end that

      that.set(spec);
      return that;
    }//end instance()
  } //end return
})();
