/*
  Tilt input. used in ImageDatasetTrainer

*/
const ImageTilter = (function(){

  const __defaultSpec = {
    flipY: false,  // flip left<->right
    rotateMaxAngle: 0, // max rotate angle in degrees
    translateMax: [0, 0], // max translation (1 -> 100%)
    inputBgColor: 0
  };

  return {
    instance: function(spec){
      const _spec = Object.assign({}, __defaultSpec, spec);

      const _imageTransformer = ImageTransformer.instance({
        bgColor: _spec.inputBgColor,
        isCropSample: true
      });
      

      const that = {
        set_transform: function(){ // pick a random transform
          _imageTransformer.pick_random(_spec);
        },


        draw: function(texture, sampleOffset, sampleScale){
          _imageTransformer.update({
            sampleOffset: sampleOffset,
            sampleScale: sampleScale,
            forcedAspectRatio: 1
          });
          _imageTransformer.draw(texture);
        },


        reDraw: function(texture){
          _imageTransformer.draw(texture);
        }
      }; // end that

      return that;
    }//end instance()
  } //end return
})();
