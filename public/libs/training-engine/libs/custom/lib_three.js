/*
Used in trainer
and more especially for custom problems

*/
const lib_three = {
  free_RAMAfterFirstDraw: function(threeObject){
    if (!threeObject){
      return;
    }
    threeObject.traverse(function(threeNode){
      if (!threeNode.isMesh){
        return;
      }
      const restoreAfterRenderFunc = threeNode.onAfterRender;
      const threeAttrs = threeNode.geometry.attributes
      threeNode.onAfterRender = function(){
        for (let attrName in threeAttrs){
          const threeAttr = threeAttrs[attrName];
          delete(threeAttr.array);
        }
        threeNode.onAfterRender = restoreAfterRenderFunc;
      }
      //threeNode.geometry.
    })
  },


  inverse_facesIndexOrder: function(geom){
    if (geom.faces){
      // geometry
      geom.faces.forEach(function(face){
        // change rotation order:
        const b = face.b, c = face.c;
        face.c = b, face.b = c;
      });
    } else  {
      // buffer geometry
      const arr = geom.index.array;
      const facesCount = arr.length / 3;
      for (let i=0; i<facesCount; ++i){
        const b = arr[i*3 + 1], c = arr[i*3 + 2];
        arr[i*3 + 2] = b, arr[i*3 + 1] = c;
      }
    }
    geom.computeVertexNormals();
  },


	mirrorX_object: function(threeObject){
    threeObject.frustumCulled = false;
    threeObject.updateMatrixWorld(true);
    
    if (threeObject.isMesh){
      // compute matrix to apply to the geometry, K
      const M = threeObject.matrixWorld;
      const invXMatrix = new THREE.Matrix4().makeScale(-1, 1, 1);
      const K = new THREE.Matrix4().copy(M).invert().multiply(invXMatrix).multiply(M);

      // clone and invert the mesh:
      const threeMeshLeft = threeObject.clone();
      threeMeshLeft.geometry = threeObject.geometry.clone();
     
      threeMeshLeft.geometry.applyMatrix4(K);
      lib_three.inverse_facesIndexOrder(threeMeshLeft.geometry);

      return threeMeshLeft;
    } else {
      const threeObjectLeft = threeObject.clone();
      threeObjectLeft.children.splice(0);
      for (let i=0; i<threeObject.children.length; ++i){
        const child = threeObject.children[i];
        threeObjectLeft.remove(child);
        threeObjectLeft.add(lib_three.mirrorX_object(child));
      }
      return threeObjectLeft;
    }
  },


  set_layerDeeply: function(threeObject, layer){
    threeObject.layers.set(layer);
    threeObject.traverse(function(threeNode){
      if (threeNode.layers){
        threeNode.layers.set(layer);
      }
    });
  },


  reset_texturesEncoding(threeModel){
    // When loaded through GLTFLoader, texture often have SRGBEncoding mode
    // So the computed gamma correction is wrong
    threeModel.traverse(function(threeNode){
      if (!threeNode.material){
        return;
      }
      if (threeNode.map){
        threeNode.map.encoding = THREE.LinearEncoding;
      }
    });
  }

};
