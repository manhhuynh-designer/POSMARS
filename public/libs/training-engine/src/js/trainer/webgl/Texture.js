/*
 * This is a texture wrapper
 * All filters are nearest
 * 
 * _spec:
 *  isFloat: boolean (default: false)
 *  isPot: boolean (default: true)
 *  isRandom: boolean for normal distribution (_spec.mean, _spec.deviation)
 *  array: float32array to fill the texture
 *  width: width of the texture in pixels
 *  height: height of the texture in pixels. If not _specified, =width
 *  url: url of the texture
 *  domElement: dom element (image, canvas, video) to init the texture
 *  callback: launched when the texture is loaded
 *  name: name of the texture
 *  isFlipY: if set GL.UNPACK_FLIP_Y_WEBGL. default: true
 *  processRawData: function(arr). for JSON only, called just after the JSON success callback on the raw json array
 *  isLinear: bool. default: false
 * 
 */

const Texture = (function() {

  const __defaultSpec = {
    // dimensions:
    'height': 0,
    'width': 0,
    
    // storage and sampling parameters:
    'isLinear': false, // linear pixel filtering
    'isFloat': false,
    'isFlipY': true,
    'isPot': false,
    'isMipmap': false,
    'isDepth': false,

    // data:
    'data': null, // if texture is recovered from a backup
    domElement: null,
    'array': null,
    'url': null,

    // for random textures:
    isRandom: false,
    mean: 0.0,
    deviation: 1.0,
    randomPow: 1.0,
    randomOffset: 0.0,
    randomScale: 1.0,
    randomDistribution: 'normal', 

    // misc:
    name: 'undefined',
    callback: null,
    isKeepImage: false,
    processRawData: null
  };

  let __samplerInd = 0, __glSamplers = null;
  const __RGBAchannels = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

  const __textures = {
    white: null,
    black: null
  };


  function check_numArray(arr){
    //PRECOMPILER_BEGINDELETE
    for (let i=0; i<arr.length; ++i){
      const v = arr[i];
      if (isNaN(v) || v === undefined || v === Infinity){
        throw new Error('ERROR in Texture.js: Invalid numeric value, cannot init texture. value =' + v.toString());
      }
    }
    //PRECOMPILER_ENDDELETE
  }
  
  
  return {
    init: function() {
      __glSamplers = [
        GL.TEXTURE0,
        GL.TEXTURE1,
        GL.TEXTURE2,
        GL.TEXTURE3,
        GL.TEXTURE4,
        GL.TEXTURE5,
        GL.TEXTURE6,
        GL.TEXTURE7
      ];

      __textures.white = Texture.instance({
        'width': 1,
        'isFloat': false,
        'array': new Uint8Array([255,255,255,255])
      });

      __textures.black = Texture.instance({
        'width': 1,
        'isFloat': false,
        'array': new Uint8Array([0,0,0,0])
      });
    },


    get_blackTexture: function() {
      return __textures.black;
    },


    get_whiteTexture: function() {
      return __textures.white;
    },


    get_gaussTexture: function(n){
      const gaussArray = new Float32Array(n*n*4);
      const sigma = 1/3; // standard deviation
      const xCtr = (n-1)/2, 
            yCtr = (n-1)/2;

      for(let x=0; x<n; x++){
        const xNorm = 2*(x-xCtr) / (n-1)

        for (let y=0; y<n; y++){
          const yNorm = 2*(y-yCtr) / (n-1);
          const i = 4*(x+y*n);

          const val = Math.exp(-(xNorm*xNorm + yNorm*yNorm) / sigma);
          const m = 4*(x+y*n);
          
          gaussArray[m] = val;   // R
          gaussArray[m + 1] = 0; // G
          gaussArray[m + 2] = 0; // B
          gaussArray[m + 3] = 1; // A
        } //end for y
      } //end for x

      return Texture.instance({
        'isFloat': true,
        'isPot': false,
        'array': gaussArray,
        'isLinear': true,
        'width': n
      });
    },


    get_one: function(){
      return __textures.white;
    },


    get_zero: function(){
      return __textures.black;
    },


    get_test512: function(onload) {
      return Texture.instance({
        'url': 'images/debug/test_512x512.jpg',
        'isMipmap': true,
        'isFloat': false,
        'isPot': true,
        callback: onload
      });
    },


    unbind: function(samplerInd) {
      if (samplerInd !== __samplerInd) {
        GL.activeTexture(__glSamplers[samplerInd]);
        __samplerInd = samplerInd;
      }
      GL.bindTexture(GL.TEXTURE_2D, null);
    },


    reset_sampler: function() {
      __samplerInd = -1;
    },


    reset: function() {
      __samplerInd = -1;
    },


    set_linearFiltering(){
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
    },


    set_nearestFiltering(){
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    },


    get_uniform: function(size, color, parameters) {
      const cv = document.createElement('canvas');
      cv.width = size, cv.height = size;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size, size);
      const baseParameters = (parameters) ? parameters : {
        'isMipmap': false,
        'isFloat': true,
        'isPot': true
      };
      return Texture.instance(Object.assign({domElement: cv}, baseParameters))
    },


    // for debug purpose: return a square checkerboard texture
    get_checkerboard: function(size, onload, period) {
      period = (typeof(period) === 'undefined') ? 1 : period;

      const canvasCheckerboard = document.createElement('canvas');
      canvasCheckerboard.width = size, canvasCheckerboard.height = size;
      const ctxCheckerboard = canvasCheckerboard.getContext('2d');

      // draw red pixels:
      const pixelIdata = ctxCheckerboard.createImageData(size, size);
      const d = pixelIdata.data;
      
      for (let x = 0; x < size; ++x) {
        for (let y = 0; y < size; ++y) {
          const n = 4 * (x + y * size);

          d[n + 3] = 255;
          if ((Math.floor(x / period) + Math.floor(y / period)) % 2) {
            // white:
            d[n] = 255, d[n + 1] = 255, d[n + 2] = 255;
          } else {
            // colored:
            d[n] = 255 * x / size;
            d[n + 1] = 255 * y / size;
            d[n + 2] = 0;
          }
        } //end loop on y
      } //end loop on x
      ctxCheckerboard.putImageData(pixelIdata, 0, 0);

      return Texture.instance({
        domElement: canvasCheckerboard,
        'isMipmap': false,
        'isFloat': true,
        'isPot': true,
        callback: onload
      });
    }, //end get_checkerboard()


    instance: function(spec) {
      const _spec = Object.assign({}, __defaultSpec, spec);

      // check and parse parameters:
      if (_spec['data']){
        // texture is recovered from backup:
        _spec['isFlipY'] = ('isFlipY' in spec) ? spec['isFlipY'] : false;
        if (typeof(_spec['data']) === 'string'){ // compressed textures
          _spec['array'] = QuantizaterDecoder_decodeFloatArray(_spec['data']);
        }  else if (_spec['isFloat']){
          _spec['array'] = new Float32Array(_spec['data']);
        } else {
          _spec['array'] = new Uint8Array(_spec['data']);
        }
      } //end if backuped texture

     _spec['height'] = (_spec['height']) ? _spec['height'] : _spec['width'];

      
      let _glTexture = null, _glPixelType = null, _isLoaded = false, _image = null;

      const _n = _spec['width'] * _spec['height'];
      let _isBufferFloatReady = false, _buffersFloat = null, _buffersByteFloat = null, _bufferByte4 = null, _bufferFloat4 = null;
      let _isBufferReady = null, _bufferByte = null;


      // determine storage params:
      const _glPixelFormat = _spec['isDepth'] ? GL.DEPTH_COMPONENT : GL.RGBA;
      const _glInternalPixelFormat = _glPixelFormat;
      _glPixelType = (_spec['isFloat']) ? GL.FLOAT : GL.UNSIGNED_BYTE;
      if (_spec['isDepth']){
        _glPixelType = GL.UNSIGNED_SHORT;
        _spec['isFlipY'] = false;
      }

      //PRECOMPILER_BEGINDELETE
      if (_spec['isMipmap'] && !_spec['isPot']){
        console.log('WARNING in Texture.js: A mipmapped texture is initialized with isPot = false. It may block mipmap generation on some configuration (Firefox)');
        console.log('  texture spec =', _spec);
        throw new Error('NOT POT MIPMAPPED TEXTURE');
        debugger;
      }
      //PRECOMPILER_ENDDELETE

      const load_texture = function() {
        _glTexture = GL.createTexture();
        GL.activeTexture(GL.TEXTURE0);
        __samplerInd = 0;
        GL.bindTexture(GL.TEXTURE_2D, _glTexture);
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, _spec['isFlipY']);
        
        // determine width and height:
        const domElement = _spec.domElement || _image;
        if (domElement) {
          _spec['width'] = _spec['width'] || domElement.width || domElement.videoWidth;
          _spec['height'] = _spec['height'] || domElement.height || domElement.videoHeight || _spec['width'];
        }
        //PRECOMPILER_BEGINDELETE
        const MAX_SIZE = 8192;
        const MAX_SIZE_FLOAT = 4096;
        const maxSize = _spec['isFloat'] ? MAX_SIZE_FLOAT : MAX_SIZE;
        if (_spec['width'] > maxSize || _spec['height'] > maxSize){
          throw new Error('Error in Texture.js: a texture seems too large to be handled by all devices. Res = ' + _spec['width'] + '*' + _spec['height']);
        }
        //PRECOMPILER_ENDDELETE


        // disable UV repeat if texture is not POT:
        if (_spec['isPot']) {
          if (!lib_maths.is_pot(_spec['width']) || !lib_maths.is_pot(_spec['height'])){
            //PRECOMPILER_BEGINLOG
            //console.log('WARNING in Texture.js: PoT property has been disabled for texture which spec =', _spec);
            //PRECOMPILER_ENDLOG
            _spec['isPot'] = false;
          }
        }
        if (!_spec['isPot'] && _spec['isMipmap'] && !lib_maths.is_pot(_spec['width'])){
          //PRECOMPILER_BEGINLOG
          console.log('ERROR in Texture.js: a NPoT texture cannot generate mipmaps');
          debugger;
          //PRECOMPILER_ENDLOG
          return;
        }
        
        // set tiling mode:
        if (_spec['isPot']) {
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
        } else {
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
        }

        // set filtering:
        if (_spec['isLinear']) {
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, (_spec['isMipmap']) ? GL.LINEAR_MIPMAP_LINEAR : GL.LINEAR);
        } else {
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
          GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, (_spec['isMipmap']) ? GL.NEAREST_MIPMAP_NEAREST : GL.NEAREST);
        }

        //PRECOMPILER_BEGINDELETE
        GL.getError();
        //PRECOMPILER_ENDDELETE

        if (_spec.domElement) {
          GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _glPixelFormat, _glPixelType, _spec.domElement);
        } else if (_spec['url']) { // init the texture with an url
          GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _glPixelFormat, _glPixelType, _image);
        } else if (_spec.isRandom) { // randomly init the texture
          let randomArray = null;
          switch(_spec.randomDistribution){
            case 'uniform':
              randomArray = lib_random.create_arrayUniformDist(_n * 4);
              break;
            case 'normal':
              randomArray = lib_random.create_arrayNormalDist(_n * 4, _spec.mean, _spec.deviation);
              break;
            default:
              throw new Error('Unknow random distribution');
          }
          if (_spec.randomPow !== 1.0){
            lib_array.apply_pow(randomArray, _spec.randomPow);
          }
          lib_array.apply_affineTransform(randomArray, _spec.randomOffset, _spec.randomScale);
          GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _spec['width'], _spec['height'], 0, _glPixelFormat, _glPixelType, randomArray);
        } else if (_spec['array']) {
          check_numArray(_spec['array']);
          GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _spec['width'], _spec['height'], 0, _glPixelFormat, _glPixelType, _spec['array']);
        } else { // init the texture as empty
          GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _spec['width'], _spec['height'], 0, _glPixelFormat, _glPixelType, null);
          if (_spec['width']<=0 || _spec['height']<=0) {
            throw new Error('ERROR in Texture.js: INVALID DIMENSIONS');
          }
        }

        //PRECOMPILER_BEGINDELETE
        if (GL.getError() !== GL['NO_ERROR']){
          console.log('WARNING in Texture.js - load_texture(): cannot fill texture data. _spec=', _spec);
          debugger;
          throw new Error('INVALID TEXTURE DATA');
        };
        //PRECOMPILER_ENDDELETE
        
        if (_spec['isMipmap']) {
          GL.generateMipmap(GL.TEXTURE_2D);
        }

        // restore state:
        if (_spec['isFlipY']){
          GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false);
        }
        GL.bindTexture(GL.TEXTURE_2D, null);

        // free memory:
        if (!_spec.isKeepImage && _image){
          _image = null;
        }

        _isLoaded = true;
        if (_spec.callback) _spec.callback(that);
      }; //end load_texture()


      const load_textureFromJSON = function(data){
        if (_spec.processRawData) {
          _spec.processRawData(data['data']);
        }

        _spec['url'] = null;
        const data4 = new Array(data['data'].length * 4); // copy RGBA channels
        _spec['width'] = Math.round(Math.sqrt(data['data'].length));
        _spec['height'] = _spec['width'];
        //lib_array.dump_squareGrid(data.data, 16); debugger;
        data['data'].forEach(function(val, idx) {
          data4[4 * idx] = val;
          data4[4 * idx + 1] = val;
          data4[4 * idx + 2] = val;
          data4[4 * idx + 3] = val;
        });
        _spec['array'] = new Float32Array(data4);
        load_texture();
      }


      const that = {
        // GETTERS
        get_glTexture: function(){
          return _glTexture;
        },


        get_element: function(){
          if (_spec.domElement){
            return _spec.domElement;
          }
          if (_image){
            return _image;
          }
          return null;
        },


        get_name: function() {
          return _spec.name;
        },

        
        get_textSize: function() {
          return _spec['width'].toString() + 'X' + _spec['height'].toString();
        },


        get_size: function() {
          return _spec['width'];
        },

        get_width: function() {
          return _spec['width'];
        },


        get_height: function() {
          return _spec['height'];
        },


        get_aspectRatio: function(){
          return _spec['width'] / _spec['height'];
        },


        get_url: function(){
          return _spec['url'];
        },

        //PRECOMPILER_BEGINDELETE
        get_spec: function(){
          return _spec;
        },
        //PRECOMPILER_ENDDELETE

        is_mipmapped: function(){
          return _spec['isMipmap'];
        },


        get_loadPromise: function(){
          if (_isLoaded){
            return Promise.resolve(that);
          }
          return new Promise(function(accept, reject){
            const callbackOriginal = _spec.callback;
            _spec.callback = function(){
              if (callbackOriginal){
                callbackOriginal(that);
              }
              accept();
            }
          }); //end returned promise
        },


        set_linearFiltering: function(){
          that.bind_toSampler(0);
          Texture.set_linearFiltering();
          Texture.unbind(0);
        },


        sync_uniformDxy: function(uName){
          Shaders.set_uniformDynamic2f(uName, 1.0 / _spec['width'], 1.0 / _spec['height']);
        },


        export_toJSON: function() {
          const is_canvasResized = (Context.get_width() < _spec['width'] || Context.get_height() < _spec['height'] * 4);
          if (is_canvasResized) {
            //PRECOMPILER_BEGINLOG
            console.log('WARNING in Texture.js - export_toJSON(): we need to resize the canvas to export a float texture');
            //PRECOMPILER_ENDLOG
            Context.save_canvasSize();
            Context.resize_canvas(_spec['width'], 4 * _spec['height']);
          }

          let textureMixedChannels = null;
          if (_spec['isFloat']){ // float texture
            that.draw_float();
            const textureChannelsFloat32 = that.read_allFloat();
            const n = textureChannelsFloat32[0].length;
            textureMixedChannels = [];
            for (let i = 0; i < n; ++i) {
              textureMixedChannels.push(
                textureChannelsFloat32[0][i], // red
                textureChannelsFloat32[1][i], // green
                textureChannelsFloat32[2][i], // blue
                textureChannelsFloat32[3][i]  // alpha
              );
            }
          } else { // not a float texture
            that.draw();
            textureMixedChannels = Array.from(that.read_all());
          }
          
          if (is_canvasResized) {
            Context.restore_canvasSize();
          }

          return {
            'isPot': _spec['isPot'],
            'width': _spec['width'],
            'isFloat': _spec['isFloat'],
            'data': textureMixedChannels
          };
        },

        
        set_glTexture: function(glTexture){
          _glTexture = glTexture;
        },

        
        // fill with a uniform color:
        fill_uniformColor: function(value) {
          if (!_spec['isFloat']) {
            //PRECOMPILER_BEGINLOG
            console.log('WARNING in Texture - fill_uniformColor: the texture is not float');
            //PRECOMPILER_ENDLOG
            return;
          }
          const valueArr = (typeof(value)==='number') ? [value,value,value,value] : value;
          const colorArray = lib_array.getFloat32ArrayFromRGBA(_n, valueArr);
          
          GL.activeTexture(GL.TEXTURE0);
          __samplerInd = 0;
          GL.bindTexture(GL.TEXTURE_2D, _glTexture);
          GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _spec['width'], _spec['height'], 0, _glPixelFormat, _glPixelType, colorArray);
        },

        
        generate_mipmap: function() {
          GL.generateMipmap(GL.TEXTURE_2D);
        },

        
        bind_toSampler: function(samplerInd) {
          if (!_isLoaded) return false;
          if (samplerInd !== __samplerInd) {
            GL.activeTexture(__glSamplers[samplerInd]);
            __samplerInd = samplerInd;
          }
          GL.bindTexture(GL.TEXTURE_2D, _glTexture);
          return true;
        },

        
        bind: function() {
          GL.bindTexture(GL.TEXTURE_2D, _glTexture);
        },

        
        set_asRenderTarget: function() {          
          GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, _glTexture, 0);
        },


        set_asRenderTargetDepth: function(){
          GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.TEXTURE_2D, _glTexture, 0);
        },

        
        set_asRenderTargetVp: function(){
          GL.viewport(0, 0, _spec['width'], _spec['height']);
          GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, _glTexture, 0);
        },

        
        unset_asRenderTarget: function() {
          GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, null, 0);
        },


        unset_asRenderTargetDepth: function(){
          GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.TEXTURE_2D, null, 0);
        },


        // draw texture for debug
        // offset is the offset in pixels on the viewport
        debug: function(vpOffset) {
          if (typeof(vpOffset) === 'undefined') {
            vpOoffset = [0, 0];
          }

          FBO.unbind();
          GL.viewport(vpOffset[0], vpOffset[1], _spec['width'], _spec['height']);
          Shaders.set('shp_copy');
          that.bind_toSampler(0);
          VBO.draw_quad(true);
        },


        // draw the texture, separating each RGBA channel
        draw_float: function() {
          FBO.unbind();
          Shaders.set('shp_floatChannel');
          that.bind_toSampler(0);

          GL.viewport(0, 0, _spec['width'], _spec['height'] * 4);
          GL.clear(GL.COLOR_BUFFER_BIT);

          for (let colorIndex = 0; colorIndex < 4; ++colorIndex) {
            GL.viewport(0, _spec['height'] * colorIndex, _spec['width'], _spec['height']);
            Shaders.set_uniformDynamic4fv('uun_channel', __RGBAchannels[colorIndex]);

            VBO.draw_quad(true);
          }
        },


        draw: function() {
          FBO.unbind();
          Shaders.set('shp_copy');
          that.bind_toSampler(0);

          GL.viewport(0, 0, _spec['width'], _spec['height']);
          GL.clear(GL.COLOR_BUFFER_BIT);

          VBO.draw_quad(true);
        },


        // draw the texture. R,G 8 bits channel -> 1st output (X). R -> MSB, G->LSB
        // B,A 8 bits channel -> 2nd output (Y)
        draw_8bitsToFloat: function() {
          Shaders.set('shp_RG_BA_8To32');
          that.bind_toSampler(0);

          GL.viewport(0, 0, _spec['width'], _spec['height']);
          GL.clear(GL.COLOR_BUFFER_BIT);

          VBO.draw_quad(true);
        },


        draw_copyScaled: function(scale) {
          Shaders.set('shp_copyChannelsScaled');
          Shaders.set_uniformDynamic1f('uun_scale', scale);
          that.bind_toSampler(0);

          GL.viewport(0, 0, _spec['width'], _spec['height']);
          GL.clear(GL.COLOR_BUFFER_BIT);

          VBO.draw_quad(true);
        },


        // draw the texture using the whole viewport
        draw_FS: function(isColored) { // USED IN TRAINER GPU LIVE VIEW (with isColored=false)
          FBO.unbindAndClear();
          that.draw_debug(isColored);
          FBO.bind_default();
        },


        draw_debug: function(isColored){
          Shaders.set((isColored) ? 'shp_displayColored' : 'shp_displayChannel');

          if (!isColored) { // TRAINER GPU LIVE VIEW
            Shaders.set_uniformDynamic1f('uun_scale', UI.get_scale());
            Shaders.set_uniformDynamic1f('uun_offset', UI.get_offset());
            Shaders.set_uniformDynamic1f('uun_abs', (UI.get_isAbs() ? 1 : 0) );
          }

          that.bind_toSampler(0);

          if (!isColored) Shaders.set_uniformDynamic4fv('uun_channel', UI.channel);
          VBO.draw_quad(true);
          Texture.unbind(0);
        },


        clone: function() {
          const clonedTexture = Texture.instance(_spec);
          clonedTexture.copy(that);
          return clonedTexture;
        },


        copy: function(srcTexture){
          FBO.bind_default();
          that.set_asRenderTargetVp();
          Shaders.set('shp_copy');
          srcTexture.bind_toSampler(0);
          VBO.bind_quad();
          VBO.draw_quad(true);
        },


        update: function(arr) {
          GL.bindTexture(GL.TEXTURE_2D, _glTexture);
          GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, _spec['isFlipY']);
          if (_spec['array']) {
            const arrUpdated = arr || _spec['array'];
            check_numArray(arrUpdated);
            GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _spec['width'], _spec['height'], 0, _glPixelFormat, _glPixelType, arrUpdated);
          } else if (_spec.domElement){            
            GL.texImage2D(GL.TEXTURE_2D, 0, _glInternalPixelFormat, _glPixelFormat, _glPixelType, _spec.domElement);            
          }
          if (_spec['isFlipY']){
            GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false);
          }
        },


        create_buffersFloat: function() { 
          const wh4 = _n * 4;
          _buffersByteFloat = [ new Uint8Array(wh4), new Uint8Array(wh4), new Uint8Array(wh4), new Uint8Array(wh4) ];
          _buffersFloat = [
            new Float32Array(_buffersByteFloat[0].buffer), // red
            new Float32Array(_buffersByteFloat[1].buffer), // green
            new Float32Array(_buffersByteFloat[2].buffer), // blue
            new Float32Array(_buffersByteFloat[3].buffer)  // alpha
          ];
          _bufferByte4 = new Uint8Array(wh4*4);
          _bufferFloat4 = new Float32Array(_bufferByte4.buffer);
          _isBufferFloatReady = true;
        },


        // see http://stackoverflow.com/questions/17981163/webgl-read-pixels-from-isFloat-point-render-target
        read_allFloat: function() {
          if (!_isBufferReady){
            that.create_buffersFloat();
          }
          
          GL.readPixels(0, 0, _spec['width'], _spec['height']*4, GL.RGBA, GL.UNSIGNED_BYTE, _bufferByte4);

          const offsetGreen = _n, offsetBlue = 2*_n, offsetAlpha = 3*_n;
          for (let i=0; i<_n; ++i){
            _buffersFloat[0][i] = _bufferFloat4[i];             // red
            _buffersFloat[1][i] = _bufferFloat4[i+offsetGreen]; // green
            _buffersFloat[2][i] = _bufferFloat4[i+offsetBlue];  // blue
            _buffersFloat[3][i] = _bufferFloat4[i+offsetAlpha]; // alpha
          }
          return _buffersFloat;
        },


        read_all: function() {
          // that.draw() should have been called before
          
          if (!_isBufferReady){
            _bufferByte = new Uint8Array(_n * 4);
          }
          GL.readPixels(0, 0, _spec['width'], _spec['height'], GL.RGBA, GL.UNSIGNED_BYTE, _bufferByte);
          return _bufferByte;
        }
      }; //end that


      if (_spec['url']) {
        const extension = _spec['url'].split('.').pop().toLowerCase();
        switch (extension) {
          case 'png':
          case 'jpg':
          case 'jpeg':
          case 'gif':
          case 'bmp':
            _image = new Image();
            _image.onload = load_texture;
            _image.src = _spec['url'];
            break;

          case 'json': // load a isFloat texture from a json
            lib_ajax.get_json(_spec['url'], load_textureFromJSON(data));
            break;

          default:
            throw new Error('Unknow extension in Texture.js. Texture URL = ' + _spec['url']);
        } //end switch extension
      } else { // if domElement provided or other case:
        load_texture();
      }

      return that;
    } //end instance()
  };

})();
