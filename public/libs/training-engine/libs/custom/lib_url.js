const lib_url = {
  get: function(argName){
    const parsed = lib_url.parse_current();
    if (argName in parsed){
      return parsed[argName];
    } else {
      return '';
    }
  },


  parse_current: function(){
    return lib_url.parse(window.location.search);
  },


  get_fileNameNoExt: function(url){
    const fileNameWithExtension = url.split('/').pop();
    const fileNameWithoutExtension = fileNameWithExtension.split('.');
    fileNameWithoutExtension.pop();
    return fileNameWithoutExtension.join('.');
  }, 


  get_extension: function(url){
    return url.split('.').pop().toUpperCase();
  },


  parse: function(url){ // get URL parameters
    const vars = {};
    if(url.length !== 0) {
      url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value){
        key = decodeURIComponent(key);
        if(typeof vars[key] === "undefined") {
          vars[key] = decodeURIComponent(value);
        } else {
          vars[key] = [].concat(vars[key], decodeURIComponent(value));
        }
      });
    }
    return vars;
  },


  add_root: function(url, root, chunk){
    if (!root || !chunk){
      return url;
    }
    if (url.includes(chunk)){
      return url.replace(chunk, root + chunk);
    };
    return root + url;
  }
};
