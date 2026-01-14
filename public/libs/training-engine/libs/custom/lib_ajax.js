const lib_ajax = {
  get: function(url, func, funcError) {  
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, true);
    xmlHttp.withCredentials = false;
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState === 4 ) {
        if (xmlHttp.status === 200 || xmlHttp.status === 0) { // Apache Cordova always returns 0 even if the answer is not empty
          func(xmlHttp.responseText);
        } else if(typeof(funcError)!=='undefined') {
          funcError(xmlHttp.status);
        }
      }
    };
    xmlHttp.send();
  },


  get_promise: function(url){
    return new Promise(function(accept, reject){
      lib_ajax.get(url, accept, reject);
    });
  },


  get_json: function(url, func, data){
    const urlWithParameters = url
      + ((data) ? '?' + lib_ajax.encode_asURLParameters(data) : '');
    lib_ajax.get(urlWithParameters, function(rawData){
      func(JSON.parse(rawData));
    });
  },


  post: function(url, data, func) { // data is in dataURL format (a=foo&b=bar)
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", url, true);
    xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");    

    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState === 4
        && (xmlHttp.status === 200 || xmlHttp.status === 0)) {
        func(xmlHttp.responseText);
      }
    };
    xmlHttp.send(data);
  },


  encode_asURLParameters: function(data){
    if (typeof(data) === 'string'){
      return data;
    }
    const url = Object.keys(data).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
    }).join('&');
    return url;
  },


  getArrayBuffer: function(url, func) {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", url, true);
    xmlHttp.responseType = 'arraybuffer';
    xmlHttp.onload = function() { func(xmlHttp.response); };
    xmlHttp.send();
  }
  

  //PRECOMPILER_BEGINDELETE
  // make a JSON file to download:
  ,download: function(data, fileName) {
    const blob = new Blob([data], {type: "octet/stream"});
    const url = window.URL.createObjectURL(blob);

    console.log('DEBUG in lib_ajax.download: store download data into window.debugLastDownloadData')
    window.debugLastDownloadData = data;
    
    const a = document.createElement("a"); // temporary download button
    document.body.appendChild(a);
    a['style'] = "display: none";
    a['href'] = url;
    a['download'] = fileName;

    setTimeout(function(){
      a.click();
      setTimeout(function(){
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 500); //end setTimeout remove button
    }, 500); //setTimeout to avoid chrome crash - end a.click
  },


  copy_toClipBoard: function(){
    const button = document.createElement("button");
    document.body.appendChild(button);
    button['style'] = "display: none";
    button.addEventListener('click', function(){
      navigator.clipboard.writeText('prout');
    });
    console.log('WARNING: Focus on the document otherwise text won\'t be copied to the clipboard');

    setTimeout(function(){
      button.click();
      setTimeout(function(){
        document.body.removeChild(button);
      }, 500); //end setTimeout remove button
    }, 1000);
  }
  //PRECOMPILER_ENDDELETE
  
};