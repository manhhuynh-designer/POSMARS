const lib_random = (function() {
  let _randomStream = null;

  function get_randomStream(){
    if (_randomStream === null){
      _randomStream = new Random(11091986);
    }
    return _randomStream;
  }

  function get_random(){
    return get_randomStream().random();
  }


  const that = {
    // see http://en.wikipedia.org/wiki/Normal_distribution
    create_arrayNormalDist: function(size, mean, deviation) {
      const dataArray = new Float32Array(size);
      for (let i=0; i<size; ++i) {
        dataArray[i] = get_randomStream().normal(mean, deviation);
      }
      return dataArray;
    },


    create_arrayUniformDist: function(size){
      const dataArray = new Float32Array(size);
      for (let i=0; i<size; ++i) {
        dataArray[i] = get_random();
      }
      return dataArray;
    },


    get_normalClamped: function(mean, deviation, min, max){
      let a = 0;
      do {
        a = get_randomStream().normal(mean, deviation);
      } while (a<min || a>max);
      return a;
    },


    get_normalClampedRelative: function(mean, nSigmas, min, max){
      const sigma = (max-min) / (2*nSigmas);
      return that.get_normalClamped(mean, sigma, min, max);
    },

    
    get_normal: function(mean, deviation) { // deviation is sigma (NOT sigma²)
      return get_randomStream().normal(mean, deviation);
    },

    
    // returns a random number between 0 and 1 (equivalent to Math.random()):
    get_random: function() {
      return get_random();
    },


    get_indFromUniformDiscreteDistribution: function(probas){
      const rdm = get_random();
      let probaSum = 0;
      for (let i=0; i<probas.length; ++i){
        probaSum += probas[i];
        if (rdm < probaSum){
          return i;
        }
      }
      throw new Error('Invalid distribution of probabilities: ' + probas.join(','));
    },
    
    // returns a random number between min and max:
    get_floatMinMax: function(min, max){
      return min + (max-min) * get_random();
    },


    // return a random number between min and max:
    get_floatMinMaxPow: function(min, max, pw){
      return min + (max-min) * Math.pow(get_random(), pw);
    },


    // same as get_floatMinMax() but with an interval:
    get_floatInRange: function(range){
      return that.get_floatMinMax(range[0], range[1]);
    },


    // same as get_floatMinMax() but with an interval:
    get_floatInRangePow: function(range, pow){
      return that.get_floatMinMaxPow(range[0], range[1], pow);
    },

    
    // returns a random number between -1 and 1:
    get_random1_1: function() {
      return (2.*get_random()) - 1.;
    },

    
    // returns a random int >=0 and <max:
    get_int: function(max){
      return Math.floor(get_random() * max);
    },


    // returns a random int >=min and <max:
    get_intInRange: function(range){
      const min = range[0], max = range[1];
      return min + Math.floor(get_random() * (max-min));
    },

    
    // return a random boolean:
    get_bool: function() {
      return (get_random() > 0.5);
    },

    
    // returns true with a probability of p, false otherwise:
    get_boolWeighted: function(p){
      return (get_random() <= p);
    },


    pick_isotropicThetaPhi: function(){
      // see http://mathworld.wolfram.com/SpherePointPicking.html for more informations
      const u = Math.random();
      const v = Math.random();
      const theta = 2*Math.PI*u; //in [0, 2pi[
      const phi = Math.acos(2*v - 1); //in [0, pi[

      return [theta, phi];
    },


    pick_isotropicVec3: function(){ // returns a random isotropic unit vector pointing from (0,0)
      const thetaPhi = that.pick_isotropicThetaPhi();
      const theta = thetaPhi[0];
      const phi = thetaPhi[1];

      const sinPhi = Math.sin(phi);

      // Y is up
      const x = Math.cos(theta) * sinPhi;
      const y = Math.cos(phi);
      const z = Math.sin(theta) * sinPhi;

      return [x,y,z];
    },


    pick_hemiIsotropicVec3: function(){
      const v = that.pick_isotropicVec3();
      v[1] = Math.abs(v[1]);
      return v;
    },


    pick_randomFromDistributionRange(range, distribution){
      return that.pick_randomFromDistribution(range[0], range[1], distribution);
    },
    

    pick_randomFromDistribution(min, max, distribution){
      let t = 0;
      if (distribution === 'uniform' || !distribution){
        // uniform distribution
        t = Math.random();
      } else {
        switch(distribution.type){
          case 'pow':
            t = Math.pow(Math.random(), distribution.pow);
          break;
          case 'powCentered':
            t = Math.pow(Math.random(), distribution.pow);
            t *= Math.sign(Math.random() - 0.5);
            t = 0.5 + t * 0.5;
          break;
        }
      }
      return (min + t * (max - min));
    }
  }; //end that
  return that;
})();
