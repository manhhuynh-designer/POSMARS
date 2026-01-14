/*
  ThreeJS materials lib
  Should be initialized with .init() method in the training script

*/
const ThreeMaterials = (function(){
  const _settings = {
    nPhongs: 512
  };

  let _isInitialized = false, _materials = null;

  const that = {

    init: function(){
      if (_isInitialized){
        return;
      }

      _materials = {
        dullLambert: new THREE.MeshLambertMaterial({
          side: THREE.DoubleSide
        }),
        phongs: []
      };

      //BUILD PHONG MATERIALS
      const specularColor = new THREE.Color(), diffuseColor = new THREE.Color();
      for (let i=0; i<_settings.nPhongs; ++i){
        let colorVal = lib_random.get_int(255) / 255;
        specularColor.setRGB(colorVal, colorVal, colorVal);

        colorVal = (50+lib_random.get_int(204)) / 255;
        diffuseColor.setRGB(colorVal, colorVal, colorVal);

        const threeMat = new THREE.MeshPhongMaterial({
          color: diffuseColor.getHex(),
          shininess: lib_random.get_floatMinMax(3, 50),
          specular: specularColor.getHex(),
          side: THREE.DoubleSide
        });

        _materials.phongs.push(threeMat);
      } //end loop on i

      
      _isInitialized = true;
    }, //end init()

    get_dullLambert: function(){
      return _materials.dullLambert;
    },

    get_phongs: function(){
      return _materials.phongs;
    }

  }; //end that

  return that;
})();