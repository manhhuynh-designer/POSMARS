const lib_vector2 = {
  fromFloat: function(f) {
    return [f, f];
  },
  

  // used in Trainer.js to apply enrich to 2d vector co
  // enrich has attributes scale, offset, rotateMatrix
  apply_transform: function(transform, co){
    // apply scale (flipY):
    const newCo = [(co[0]*2-1)*transform.scale[0], (co[1]*2-1)*transform.scale[1]];
    
    // apply rotation:
    const newCoRotated = [newCo[0]*transform.rotateMatrix[0]+newCo[1]*transform.rotateMatrix[2],
              newCo[0]*transform.rotateMatrix[1]+newCo[1]*transform.rotateMatrix[3]];
        
    // apply offset
    newCoRotated[0] += transform.offset[0];
    newCoRotated[1] += transform.offset[1];
  
    newCoRotated[0] = (newCoRotated[0]+1) / 2;
    newCoRotated[1] = (newCoRotated[1]+1) / 2;
    
    return newCoRotated;
  },


  get_vec: function(A, B){
    return [B[0]-A[0], B[1]-A[1]];
  },


  det: function(u, v){ // determinant
    return u[0]*v[1] - u[1]*v[0];
  },


  // return intersection point between [AB] and [CD]:
  intersect_segments: function(A, B, C, D){
    const r = lib_vector2.get_vec(A, B);
    const s = lib_vector2.get_vec(C, D);
    const AC = lib_vector2.get_vec(A, C);

    // compute intersection point between (A,u) and (B,v):
    // k so that A+tr = I
    const t = lib_vector2.det(AC, s) / lib_vector2.det(r,s);
    return [A[0] + t*r[0], A[1] + t*r[1]];
  }

};


