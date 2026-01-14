const RandomImageRenderer = (function(){
  const __defaultImageGenSpec = {
    // image path generation:
    'imagePath': 'trainingData/random/atlas/',
    'imagePrefix': 'output_',
    'extension': 'png',
    'count': 2,
    'countOffset': 0,
    'fileNameCharsCount': 0,

    // image geometric transform:
    'scaleRange': [0.03, 0.06],
    'scalePow': 2,
    'flipY': true,
    'flipX': true,
    'isCropSample': false,
    'rotateMaxAngle': 180,
    'translateMax': 1,

    // texture filtering:
    'isMipmap': false,

    // image color tweaking:
    'brightnessRange': [0.5, 1.5]
  };


  const superThat = {
    instance: function(spec, outputWidth, onloadCallback, trainingDataRoot){
      let _currentImageGen = null;
      const _trainingDataRoot = trainingDataRoot || '';

      // init output texture:
      const _outputTexture = Texture.instance({
        'isFloat': false,
        'isLinear': true,
        'isPot': false,
        'width': outputWidth
      });

      // initialize image transformer:
      const _imageTransformer = ImageTransformer.instance({});

      //const imageGensSpecs = (spec.length) ? spec : [ spec ];
      const imageGensSpecs = spec['imageSets'];
      

      // compute probabilities and complete image gen specs:
      const _imageGensProbas = imageGensSpecs.map(function(spec){
        spec.trainingDataRoot = _trainingDataRoot;
        return (typeof(spec['probability']) !== 'undefined') ? spec['probability'] : 1/imageGensSpecs.length;
      });

      // instantiate the image generators:
      let nImageGenLoaded = 0;
      const __imageGens = imageGensSpecs.map(superThat.build_imageGen.bind(null, function(){
        if (++nImageGenLoaded === imageGensSpecs.length && onloadCallback){
          onloadCallback();
        }
      }));

      const that = {
        set : function() {
          // pick a random image generator:
          const ind = lib_random.get_indFromUniformDiscreteDistribution(_imageGensProbas);
          _currentImageGen = __imageGens[ind];

          _currentImageGen.set(_imageTransformer);
          return true;
        },

        draw: function(){
          that.set();
          _outputTexture.set_asRenderTargetVp();
          const inputTexture = _currentImageGen.get_texture();
          _imageTransformer.draw(inputTexture);
          _outputTexture.bind_toSampler(0);
          return _outputTexture;
        },

        get_outputTexture: function(){
          return _outputTexture;
        },

        pick_randomTexture: function(){
          that.set();
          return _currentImageGen.get_texture();
        },

        get_allTextures: function(){
          let allTextures = [];
          __imageGens.forEach(function(ig){
            allTextures = allTextures.concat(ig.get_allTextures());
          });
          return allTextures;
        }
      }; // end that
      return that;
    },//end init()


    build_imageGen: function(onloadCallback, spec){
      let _imageIndex = -1;
      const _spec = Object.assign({}, __defaultImageGenSpec, spec);
      
      // Load random textures:
      const _textures = [];

      let nLoaded = 0;
      
      const check_isLoaded = function(){
        if (++nLoaded === _spec['count']){
          onloadCallback();
        } else {
          load_texture(nLoaded, spec.trainingDataRoot);
        }
      }; 


      const load_texture = function(i, trainingDataRoot){
        let fileName = (i + _spec['countOffset']).toString();
        if (_spec['fileNameCharsCount']){ // pad with 0:
          while (fileName.length < _spec['fileNameCharsCount']) fileName = '0' + fileName;
        }

        const imageFullPath = _spec['imagePath'] + _spec['imagePrefix'] + fileName + '.' + _spec['extension'];
        _textures.push(Texture.instance({
          'isFloat': false,
          'isLinear': true,
          'isMipmap': _spec['isMipmap'],
          'isPot': true,
          'url': lib_url.add_root(imageFullPath, trainingDataRoot, 'trainingData/'),
          callback: function() {
            check_isLoaded();
          }
        }));
      };


      load_texture(0, spec.trainingDataRoot);
      /*for (let i = 0; i < _spec['count']; ++i) {
        load_texture(i, spec.trainingDataRoot);
      } //end loop over files*/


      return {
        set: function(imageTransformer){
          imageTransformer.update(_spec);
          imageTransformer.pick_random(_spec);
          _imageIndex = lib_random.get_int(_spec['count']);
        },


        get_texture: function(){
          return _textures[_imageIndex];
        },


        get_allTextures: function(){
          return _textures;
        }
      }; //end returned value
    } //end build_imageGen()
  }; //end superThat

  return superThat;
})()
