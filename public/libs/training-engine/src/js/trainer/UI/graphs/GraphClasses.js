/*
 * CLASSIFICATION MONITORING
 * 
 * Display 1 bar sets (RGBA) for each class
 * and display 1 histogram per minibatch
 * 
 * spec:
 *   - id: id of the div where to put the graph
 *   - width: width of the graph
 *   - minibatchSize: number of minibatchs
 *   - classesCount: number of classes
 *   
 */

const GraphClasses = (function() {
  return {
    instance: function(spec) {
      let _barWidth = 1,        // width of a bar in pixels
        _hSpaceBetweenBars = 2, // space between 2 bar in pixels
        _maxBarHeight = 200,    // max bar height in pixels (probability = 1)
        _histoVSpace = 30;      // vertical space between 2 histogram in pixels
      
      // clean:
      const jqContainer = $('#' + spec.id);
      jqContainer.empty();
      
      // setup canvas and 2d context:
      const _jqCv = $('<canvas>').prependTo(jqContainer);
      const _cv = _jqCv.get(0);
      
      _cv.width = spec.width;
      _cv.height = 1 * (_maxBarHeight + _histoVSpace);
      
      const _ctx = _cv.getContext('2d');
      _ctx.lineWidth = _barWidth;
      _ctx.font = '8pt Helvetica';
      
      // compute some layout parameters:
      const _hSpaceBetweenClasses = Math.floor(spec.width / spec.classesCount);
      const _colors = ['#ff0000', '#00ff00', '#0000ff', '#000000'];
      
      const that = {
        compute_softMax: function(expectedInd, result){

          // compute exponential:
          const resultExp = result.map(function(classResultRGBA, classInd){
            
            return classResultRGBA.map(function(valPlusExpected){
              const valExpected = (expectedInd === classInd) ? 1.0 : 0.0;
              const val = valPlusExpected - valExpected;
              
              return Math.exp(-val);
            });
          });

          // normalize to get a probability distribution:
          const sumExps = [0, 0, 0, 0]; // for the RGBA chanels
          resultExp.forEach(function(classResultRGBAExp){
            for (let i=0; i<4; ++i){
              sumExps[i] += classResultRGBAExp[i];
            }
          });

          resultExp.forEach(function(classResultRGBAExp){
            for (let i=0; i<4; ++i){
              classResultRGBAExp[i] /= sumExps[i];
            }
          });

          return resultExp;
        },


        // update displayed datas:
        update: function(expectedInd, resultMinibatch){

          const resultMinibatchSoftMaxed = that.compute_softMax(expectedInd, resultMinibatch);

          _ctx.fillStyle = '#eeeeee';
          _ctx.fillRect(0, 0, _cv.width, _cv.height);
          _ctx.fillStyle = '#000000';
          
          for (let colorIndex=0; colorIndex<4; ++colorIndex){ // loop on colors
            
            _ctx.beginPath();
            _ctx.strokeStyle = _colors[colorIndex];
            
            const vOffset = 12;

            for (let classIndex=0; classIndex<spec.classesCount; ++classIndex){ // loop on classes
              const hOffset = colorIndex * (_barWidth + _hSpaceBetweenBars) + _hSpaceBetweenClasses * (classIndex + 0.5);
              const yBaseBar = vOffset + _maxBarHeight;
              _ctx.moveTo(hOffset, yBaseBar);
              _ctx.lineTo(hOffset, yBaseBar - resultMinibatchSoftMaxed[classIndex][colorIndex] * _maxBarHeight);

              // display the class index:
              if (colorIndex === 3){
                if (classIndex === expectedInd){
                  _ctx.fillStyle = '#ff0000';
                }
                _ctx.fillText(classIndex.toString(), hOffset-((_barWidth+_hSpaceBetweenBars)*4+0), vOffset+_maxBarHeight+13);
                if (classIndex === expectedInd){
                  _ctx.fillStyle = '#000000';
                }
              }

            }//end loop on classes
            
            _ctx.stroke();
          } //end loop on colors
        } //end that.update()
         
        
      }; //end that
      return that;
    }, //end instance()
    

    // functionnal test - for debug only:
    debug: function() {
      const debugGraph = GraphClasses.instance({
        id: 'liveViewTabContent',
        width: '400',
        minibatchSize: 3,
        classesCount: 4
      });
      
      debugGraph.update(
      // EXPECTED:
      [
        0, // minibatch 0
        1, // minibatch 1
        2  // minibatch 2
      ],
      
      // RESULT:
      [
        // Minibatch 0:
        [
          [0.33,0.33,0.33,0.33], // class 0
          [0.33,0.33,0.33,0.33], // class 1
          [0.33,0.33,0.33,0.33], // class 2
          [0.33,0.33,0.33,0.33]  // class 3
        ],
        
        // Minibatch 1:
        [
          [1,1,1,1], // class 0
          [0,0,0,0], // class 1
          [1,1,1,1], // class 2
          [0,0,0,0]  // class 3
        ],
        
        // Minibatch 2:
        [
          [0,1,0,1], // class 0
          [1,0,1,0], // class 1
          [1,1,0,1], // class 2
          [1,1,1,1]  // class 3
        ]
      ]);
    }
  };
})();

