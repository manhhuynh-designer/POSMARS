//PRECOMPILER_BEGINLOG
const GLDebugger = (function(){
  let _isEnableGetError = true;
  //_isEnableGetError = false;

  if (_isEnableGetError){
    console.log('WARNING in GLDebugger: GL.getError() is enabled. It may create important slowdowns. Please run the JS profiler to check it.');
  } else {
    console.log('WARNING in GLDebugger: GL.getError() is disabled. Some WebGL errors may be not caught.');
  }

  function get_GLError(){
    return (_isEnableGetError) ? GL['getError']() : GL['NO_ERROR'];
  }


  const that  =  {
    get_jsType: function(val){
      let tp = Object.prototype.toString.call(val); 
      tp = tp.replace('[object ', '[');
      tp = tp.replace('[', '');
      tp = tp.replace(']', '');
      return tp;
    },


    get_GLEnum: function(enumVal, glArg){
      if (!enumVal){
        return enumVal;
      }
      const gl = glArg || GL;
      let keyFound = null;
      for (let key in gl){
        if (gl[key] === enumVal){
          keyFound = key;
          break;
        }
      }
      if (keyFound){
        return ('gl.' + keyFound);
      } else {
        return ('[GL.KEYNOTFOUND for ' + enumVal.toString() + ']');
      }
    },


    log_glEnums: function(msg, enumVals, glArg){
      const gl = glArg || GL;
      const enumValsStr = [];
      for (let key in enumVals){
        enumValsStr.push('    ' + key + ': ' + that.get_GLEnum(enumVals[key], gl));
      }
      console.log(msg + '\n' + enumValsStr.join('\n'));
    },


    log_FBStatus: function(msg){
      const GLFBStatus = GL['checkFramebufferStatus'](GL['FRAMEBUFFER']);
      that.log_GLEnum(msg, GLFBStatus);
    },


    log_GLEnum: function(msg, enumVal, gl){
      const enumKey = that.get_GLEnum(enumVal, gl);
      console.log(msg, enumKey);
    },


    catch_GLError: function(msgPrefix, isAlert){
      const glErr = get_GLError();
      if (glErr){
        const glErrKey = that.get_GLEnum(glErr);
        const glErrMsg = msgPrefix + ': GL ERROR = ' + glErrKey;
        console.log(glErrMsg);
        if (isAlert){
          alert(glErrMsg)
        }
        return true;
      }
      return false;
    },


    reset: function(){
      get_GLError();
    }


    //PRECOMPILER_ENDLOG
    //PRECOMPILER_BEGINDELETE
    ,display_shaderCompilationError: function(GLSLerror, shaderSource, shaderName){
      // make globals:
      console.log('TIP: debugShaderSource is the buggy shader source !');
      window.debugShaderSource = shaderSource;

      const errorDiv = document.createElement('div');
      errorDiv.style.textAlign = 'left';
      errorDiv.style.position = 'absolute';
      errorDiv.style.overflowY = 'scroll';
      errorDiv.style.width = '100%';
      errorDiv.style.height = '100%';
      errorDiv.style.top = '0px';
      errorDiv.style.left = '0px';
      errorDiv.style.zIndex = 2000;
      errorDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
      errorDiv.style.boxSizing = 'border-box';
      errorDiv.style.padding = '20px';
      errorDiv.style.color = 'white';
      document.body.appendChild(errorDiv);

      const errorTitle  =  document.createElement('h1');
      errorTitle.innerHTML = 'GLDebugger.js - GLSL compilation error';
      errorDiv.appendChild(errorTitle);

      const add_label  =  function(labelHTML){
        const labelDiv = document.createElement('div');
        labelDiv.style.display = 'block';
        labelDiv.style.marginTop = '2em';
        labelDiv.innerHTML = '<b>'+labelHTML+'</b><br/>';
        errorDiv.appendChild(labelDiv);
      }
      
      add_label('ERROR in ' + shaderName + '');
      add_label('Raw error message:');

      const add_textarea = function(content){
        const ta = document.createElement('textarea');
        ta.style.width = '600px';
        ta.style.height = '300px';
        errorDiv.appendChild(ta);
        ta.value = content;
      };
      add_textarea(GLSLerror);

      
      add_label('ERROR EXPLOITATION:');
      const errorsParsed = GLSLerror.split('ERROR');
      const sourceParsed = shaderSource.split("\n");
      const errorsList = document.createElement('ul');
      errorsParsed.forEach(function(errorChunk){
        if (errorChunk === ''){
          return;
        }
        const errorItem = document.createElement('li');
        errorItem.innerHTML = errorChunk + '<br>';
        errorsList.appendChild(errorItem);

        const errorParsed = errorChunk.split(':');
        if (errorParsed.length < 3){
          return;
        }
        const errorLine = parseInt(errorParsed[2]);
        const errorCode = document.createElement('pre');
        errorCode.innerHTML = sourceParsed[errorLine-1] + '\n' + sourceParsed[errorLine];
        errorCode.style.color = 'lime';
        errorItem.appendChild(errorCode);
      }); //end loop on errors
      errorDiv.appendChild(errorsList);

      add_label('Raw shader source:');
      add_textarea(shaderSource);
    } //end display()
    //PRECOMPILER_ENDDELETE
    //PRECOMPILER_BEGINLOG

  }; //end that
  return that;
})();
//PRECOMPILER_ENDLOG

 