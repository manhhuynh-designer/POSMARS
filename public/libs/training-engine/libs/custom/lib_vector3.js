const lib_vector3 = {
  get: function() {
    return [0.0, 0.0, 0.0];
  },
  
  add: function(r,u){
    r[0] += u[0];
    r[1] += u[1];
    r[2] += u[2];    
  },

  sub: function(r,u){
    r[0] -= u[0];
    r[1] -= u[1];
    r[2] -= u[2];    
  },

  addNew: function(u,v){
    return [u[0]+v[0], u[1]+v[1], u[2]+v[2]];
  },

  add3: function(u,v,w,r){
    r[0] = u[0] + v[0] + w[0];
    r[1] = u[1] + v[1] + w[1];
    r[2] = u[2] + v[2] + w[2];
  },

  scale: function(u, s){
    u[0]*=s, u[1]*=s, u[2]*=s;
  },

  multScalarNew: function(u,s){
    return [u[0]*s, u[1]*s, u[2]*s];
  }
};
