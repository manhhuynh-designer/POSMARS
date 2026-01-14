
const lib_maths = {
  get_nextPow2: function(n){
    //const pow2 = Math.log(n) / Math.log(2);
    //return Math.ceil(pow2);
    return Math.ceil(Math.log2(n));
  },
  
  ln2: function(x) {
    return Math.log2(x);
  },

  is_pot: function(x){
    const ln2x = Math.log2(x);
    return (ln2x%1 === 0);//(ln2x === Math.floor(ln2x));
  },
  
  check_probaSetRGBA: function(probaRGBA){
    const sum = [0,0,0,0];
    probaRGBA.forEach(function(elt){
      sum[0] += elt[0],
      sum[1] += elt[1],
      sum[2] += elt[2],
      sum[3] += elt[3];
    });
    
    return sum;
  },
  
  clamp: function(x, min, max){
    return Math.min(Math.max(x, min), max);
  },
  
  convert_degToRad: function(angleDeg){
    return angleDeg*Math.PI / 180;
  },
  
  reduce_significance: function(n, prec){
    const p = Math.pow(10, prec);
    return Math.round(n*p)/p;
  },
  
  reduce_significanceFast: function(n){
    return Math.round(n*1e6) / 1e6;
  },

  get_percent: function(x, n) {
    return (100 * x/n).toFixed(3);
  },

  mix: function(x, y, t){ // same as GLSL mix
    return x*(1.0-t) + y*t;
  },

  mix_inRange: function(range, t){
    return range[0]*(1.0-t) + range[1]*t;
  },

  // return the difference between 2 angles clamped in [-PI, PI]
  // from https://stackoverflow.com/questions/1878907/the-smallest-difference-between-2-angles
  diff_angles: function(a, b){
    //return Math.atan2(Math.sin(a-b), Math.cos(a-b));
    return lib_maths.clamp_angle(a - b);
  },

  clamp_angle: function(a){
    let r = a;
    while (r > Math.PI) r -= 2*Math.PI;
    while (r <= -Math.PI) r += 2*Math.PI;
    return r;
  },

  diff_anglesAbs: function(a, b){
    return Math.abs(lib_maths.diff_angles(a,b));
  },

  angle_mean2: function(a, b){
    const dy = Math.sin(a) + Math.sin(b);
    const dx = Math.cos(a) + Math.cos(b);
    return Math.atan2(dy, dx);
  }
};

