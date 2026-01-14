/*
 * IDENTIFICATION MONITORING
 * 
 * Display 1 bar sets (RGBA) for each class
 * and display 1 histogram per minibatch
 * 
 * spec:
 *   - id: id of the div where to put the graph
 *   - width: width of the graph
 *   - height: height of the graph
 *   - size: input size result (warning: size in px of the SIDE of the output texture).
 *    ex: for 8*8=64 outputs, size=8
 *   
 */

const GraphIdent = (function() {
  return {
    instance: function(spec) {
      let _barWidth = 1, // width of a bar in pixels
        _barSpace = 7; // space between 2 bar in pixels
        
      // clean:
      const container = $('#' + spec.id);
      container.empty();
      
      // setup canvas and 2d context:
      const _jqCv = $('<canvas>').prependTo(container);
      const _cv = _jqCv.get(0);
      
      _cv.width = spec.width;
      _cv.height = spec.height;
      
      const _ctx = _cv.getContext('2d');
      _ctx.lineWidth = _barWidth;
      _ctx.font = '8pt Helvetica';
      
      // compute some layout parameters:
      const _colors = ['#ff0000', '#00ff00', '#0000ff', '#000000'];
      
      return {
        // update displayed datas:
        update: function(result) {
          _ctx.fillStyle = '#eeeeee';
          _ctx.fillRect(0, 0, _cv.width, _cv.height);
          _ctx.fillStyle = '#000000';
          
          for (let colorIndex=0; colorIndex<4; ++colorIndex){ // loop on colors
            
            _ctx.beginPath();
            _ctx.strokeStyle = _colors[colorIndex];
            
            let vOffset = 12;
            
            for (let classIndex=0; classIndex<spec.size*spec.size; ++classIndex){ // loop on classes
              const hOffset = colorIndex * _barWidth + _barSpace * (classIndex+0.5);
              _ctx.moveTo(hOffset, vOffset + spec.height);
              
              const delta = Math.abs(result[classIndex][colorIndex]);
              _ctx.lineTo(hOffset, vOffset + (1 - delta) * spec.height);
              //_ctx.lineTo(hOffset, vOffset);
              
              // display the class index:
              if (colorIndex === 3){
                 _ctx.fillText(classIndex, hOffset-((_barWidth+_barSpace)*4+0), vOffset+spec.height+13);
              }

            }//end loop on classes
               
            
            _ctx.stroke();
          } //end loop on colors
        } //end update()
         
      };
    }, //end instance()
    

    // unit test - for debug only
    debug: function() {
      const debugGraph = GraphIdent.instance({
        id: 'liveViewTabContent',
        width: '400',
        height: '300',
        size: 3
      });
      
      debugGraph.update(
      // EXPECTED:
      /* [
        0,    // output var 0
        0.33, // output var 1
        0.6   // output var 2
      ],*/
      
      // RESULT:
      [
        [0,0,0,0],  // RED
        [1,1,1,1],  // GREEN
        [0,1,0,1]
      ]);
    }
  };
})();
