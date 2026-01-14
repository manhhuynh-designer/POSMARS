/*
 * Vertex Buffer Object
 * 
 */
let VBO = (function() {
  let _glFillScreenVerticesVBO = null,
      _glFillScreenIndicesVBO = null;
    
  const that = {
    init: function() {
      // POINTS:
      const fillScreenVerticesArr = [
        -1, -1,  // first corner -> bottom left of the viewport
         3, -1,  // bottom right
        -1,  3   // top right
      ];

      _glFillScreenVerticesVBO = GL.createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, _glFillScreenVerticesVBO);
      GL.bufferData(GL.ARRAY_BUFFER,
              new Float32Array(fillScreenVerticesArr), GL.STATIC_DRAW);

      // FACES:
      const fillScreenFacesArr = [0, 1, 2];
      _glFillScreenIndicesVBO = GL.createBuffer();
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, _glFillScreenIndicesVBO);
      GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
              new Uint16Array(fillScreenFacesArr), GL.STATIC_DRAW);
              
      that.bind_quad();
    },
    

    bind_quad: function() {
      GL.bindBuffer(GL.ARRAY_BUFFER, _glFillScreenVerticesVBO);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, _glFillScreenIndicesVBO);
    },

    
    draw_quad: function(isSetPointers) {
      if (isSetPointers){
        Shaders.set_vertexPointers();
      }
      GL.drawElements(GL.TRIANGLES, 3, GL.UNSIGNED_SHORT, 0);
    },
    

    unbind: function(){
      GL.bindBuffer(GL.ARRAY_BUFFER, null);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    }
  }; //end that

  return that;
})();