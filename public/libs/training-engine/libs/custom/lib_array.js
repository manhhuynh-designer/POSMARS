const lib_array = {
  getFloat32ArrayFromRGBA: function(size, value){
    let r = [];
    for (let i=0; i<size; ++i){
      r = r.concat(value);
    }
    return new Float32Array(r);
  },


  check_floatingSpecials: function(arr){
    for (let i=0; i<arr.length; ++i){
      const a = arr[i];
      if (isNaN(a)){
        console.log('INFO in lib_array.check_floatingSpecials(): NaN value at index ', i);
        debugger;
      } else if (!isFinite(a)){
        console.log('INFO in lib_array.check_floatingSpecials(): infinite value at index ', i);
        debugger;
      } else if (typeof(a)!=="number"){
        console.log('INFO in lib_array.check_floatingSpecials(): wrong type at index ', i);
        debugger;
      }
    }
  },


  set_4vals: function(arr, i, val) { // set 4 vals from index i
    arr[i] = val;
    arr[i+1] = val;
    arr[i+2] = val;
    arr[i+3] = val;
  },


  clamp: function(arr, range){
    const n = arr.length;
    const minVal = range[0], maxVal = range[1];
    for (let i=0; i<n; ++i){
      arr[i] = Math.min(Math.max(arr[i], minVal), maxVal);
    }
  },


  apply_pow: function(arr, pw){
    const n = arr.length;
    for (let i=0; i<n; ++i){
      arr[i] = Math.pow(arr[i], pw);
    }
  },


  apply_affineTransform: function(arr, offset, scale){
    const n = arr.length;
    for (let i=0; i<n; ++i){
      arr[i] = offset + (arr[i] * scale);
    }
  },


  duplicate_RGBA: function(arr) { // duplicate each value 4 times, and return array 4 times bigger
    const r = new Array(arr.length*4);
    arr.forEach(function(v, i){
      r[4*i] = v,
      r[4*i+1] = v,
      r[4*i+2] = v,
      r[4*i+3] = v;
    });
    return r;
  },


  untype: function(typedArr){ // see https://stackoverflow.com/questions/12760643/how-to-convert-a-javascript-typed-array-into-a-javascript-array
    return Array.prototype.slice.call(typedArr);
  },


  flatten_toMatrix: function(arr, n){ // reconstruct 2D matrix array from flatten version
    const r=new Array(n);
    for (let y=0; y<n; ++y){
      const l = new Array(n);
      for (let x=0; x<n; ++x){
        l[x] = arr[y*n+x];
      } //end for x
      r[y] = l;
    } //end for y
    return r;
  },


  pick_random: function(arr){ // choose a random element
    const randomIndex = Math.floor(Math.random()*arr.length);
    return arr[randomIndex];
  },


  /*
    Choose a random element in an array of object.
    Each object has a 'probability' propery
   */
  pick_randomObjectDistribution: function(arr){
    const epsilon = 1e-2;

    // check and complete probability:
    let probasSum = 0, probaUndefItems = [];
    arr.forEach(function(item){
      if (typeof(item['probability']) === 'undefined'){
        probaUndefItems.push(item)
        return;
      }
      probasSum += item['probability'];
    });
   
    if (probasSum > 1 + epsilon){
      throw new Error('Invalid probability distribution for', arr);
    }
    if (probaUndefItems.length > 0){
      // set all items with undefined probability as equiprobable:
      const pUndef = (1 - probasSum) / probaUndefItems.length;
      probaUndefItems.forEach(function(item){
        item['probability'] = pUndef;
      });
    } /*else if (probasSum < 1 - epsilon){
      throw new Error('Invalid probability distribution for', arr);
    }*/

    while(true){
      const k = Math.random();
      let pSum = 0;
      for (let i=0; i<arr.length; ++i){
        pSum += arr[i]['probability'];
        if (k < pSum){
          return arr[i];
        }
      }
    }
  },


  flip_x: function(arr, sizeX, sizeY) {
    const r = new Array(arr.length);

    for (let y=0; y<sizeY; ++y){
      for (let x=0; x<sizeX; ++x){
        const n = y*sizeX+x;
        const nInv = y*sizeX + (sizeX-1-x);
        r[nInv] = arr[n];
      }
    }
    return r;
  },


  flip_y: function(arr, sizeX, sizeY) {
    const r = new Array(arr.length);

    for (let y=0; y<sizeY; ++y){
      for (let x=0; x<sizeX; ++x){
        const n = y*sizeX+x;
        const nInv = (sizeY-1-y)*sizeX+x;
        r[nInv] = arr[n];
      }
    }
    return r;
  },


  convert_floatToImageData: function(arr) { // duplicate each value 3 times, and return array 4 times bigger
    const iData = new Array(arr.length*4);
    arr.forEach(function(v, i){
      iData[4*i] = Math.round(v*255);
      iData[4*i+1] = Math.round(v*255);
      iData[4*i+2] = Math.round(v*255);
      iData[4*i+3] = 255;
    });
    return new Uint8ClampedArray(iData);
  },


  convert_imageDataToFloat: function(iData) { // only keeps red channel
    const arr = new Array(iData.length/4);
    for (let i=0; i<arr.length; ++i){
      arr[i] = iData[4*i]/255;
    }
    return arr;
  },


  create0: function(n) {
    return lib_array.create(0, n);
  },


  create: function(a, n){
    const r = new Array(n);
    for (let i=0; i<n; ++i) {
      r[i] = a;
    }
    return r;
  },
  

  copy: function(from, to){
    for (let i=0; i<from.length; ++i){
      to[i] = from[i];
    }
  },


  clone: function(arr){
    const zou = new Array(arr.length);
    for (let i=0; i<arr.length; ++i) {
      zou[i] = arr[i];
    }
    return zou;
  },
  

  reduce_significance: function(arr){
    const r = [];
    for (let i=0; i<arr.length; ++i){
      r.push(lib_maths.reduce_significance(arr[i]));
    }
    return r;
  },


  scaleClone: function(arr, factor){
    return arr.map(function(v){
      return v * factor;
    });
  },
  

  scaleNew: function(src, dst, factor){
    src.forEach(function(a, i){
       dst[i] = a*factor; 
    });
  },


  shuffle: function(arr){
    for (let i = arr.length - 1; i > 0; --i) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
  },
  

  reduce_significanceFast: function(arr, prec){
    const prec10 = Math.pow(10, prec);
    const zou = new Array(arr.length);

    const ziou = function(n){
      return Math.round(n*prec10) / prec10;
    };

    arr.forEach(function(n, i){
      zou[i] = ziou(n);
    });
    
    arr = null;
    
    return zou;
  },


  /*
  - grid is a grid formed by n*n square samples of dimension m. it is given as a flattened 1D array (dimension n*n*m)
  - avg is the average of 1 sample. it is given as a flattened 1D array (dimension m)
  - scale is optional

  this function substract avg to grid and returns grid
  WARNING: it modifies the input grid value
  */
  subAvg_squareGrid: function(grid, n, avg, scale){
    var x, y,
      i, m=Math.round(Math.sqrt(avg.length)),
      xx, yy,
      x_grid, y_grid, i_grid, i_avg;

    for (y=0; y<n; ++y){ // loop over y° sample
      for (x=0; x<n; ++x) { // loop over x° sample 

        for (yy=0; yy<m; ++yy){ // loop over y values in the (x, y) sample
          for (xx=0; xx<m; ++xx){ // loop over x values in the (x, y) sample

            x_grid=xx+x*m;
            y_grid=yy+y*m;

            i_grid=x_grid+y_grid*(m*n);
            i_avg=xx+yy*m;
            //console.log(grid[i_grid], avg[i_avg]);
            grid[i_grid]-=avg[i_avg]; //ZOU
            if (scale) {
              grid[i_grid]*=scale[i_avg];
            }

          } //xx
        } //yy

      } //x
    } //y
  }, //end subAvg_squareGrid()


  /*
  returns an array of n*n values
  each ith value is an array corresponding to the ith batch
  */
  decompose_squareGrid: function(arr, n){
    var x, y,
      i, m,
      xx, yy,
      x_grid, y_grid, i_grid;

    var m = Math.sqrt(arr.length/(n*n));
    if (m !== Math.floor(m)){
      m = Math.pow(2, Math.ceil(Math.log(m)/Math.log(2)));
    }

    // init output array:
    var outputArr=[];
    for (var k=0; k<n*n; ++k){
      outputArr.push([]);
    }

    // fill output array:
    for (y=0; y<n; ++y){ // loop over y° sample
      for (x=0; x<n; ++x) { // loop over x° sample 

        for (yy=0; yy<m; ++yy){ // loop over y values in the (x, y) sample
          for (xx=0; xx<m; ++xx){ // loop over x values in the (x, y) sample

            x_grid = xx+x*m;
            y_grid = yy+y*m;

            i_grid = x_grid+y_grid*(m*n);
            
            //console.log(grid[i_grid], avg[i_avg]);
            outputArr[y*n + x].push(arr[i_grid]);
          } //xx
        } //yy
      } //x
    } //y

    return outputArr;
  }, //end decompose_squareGrid()

  compose_squareGrid: function(arr) {
    var n=Math.sqrt(arr.length);
    var m=Math.sqrt(arr[0].length);
    var x, y,
      i,
      xx, yy,
      x_grid, y_grid, i_grid;

    if (m !== Math.floor(m)){
      m = Math.pow(2, Math.ceil(Math.log(m)/Math.log(2)));
    }

    var outputArr = new Array(n*n*m*m);

    for (y=0; y<n; ++y){ // loop over y° sample
      for (x=0; x<n; ++x) { // loop over x° sample 

        for (yy=0; yy<m; ++yy){ // loop over y values in the (x, y) sample
          for (xx=0; xx<m; ++xx){ // loop over x values in the (x, y) sample

            x_grid = xx+x*m;
            y_grid = yy+y*m;

            i_grid = x_grid+y_grid*(m*n);
            
            outputArr[i_grid] = arr[y*n + x][yy*m+xx];
            
          } //xx
        } //yy
      } //x
    } //y

    return outputArr;
  }, //end compose_squareGrid()


  /*
  Debug function
  - grid is a grid formed by n*n square samples of dimension m. it is given as a flattened 1D array (dimension n*n*m)
  
  */
  dump_squareGrid: function(grid, n){
    const m = Math.round(Math.sqrt(grid.length) / n);

    console.log('Each sample mesures ',m,'*',m,'px');
    var nm = n*m;
    var r = '>';

    for (let y=0; y<nm; ++y){
      
      for (let x=0; x<nm; ++x){
        const zou = y*nm + x;
        r += grid[zou]+'|';
      }
      r+='\n>';
      //console.log(/* y, ':', */r.join('|'));
    }
    console.log(r);
  } //end dump_squareGrid()
};
