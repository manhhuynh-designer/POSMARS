/* 
 * wrapper around webgl object: FrameBuffer Object
 * 
 * _spec:
 *  <int> width: width of the FBO in pixels (always square)
 *  <int> height: height of the FBO in pixels (=width if not _specified)
 */

let FBO = (function() {

  const __defaultSpec = {
    width: 0,
    height: 0
  };

  let __glFbo = null, __isInitialized = false;


  const superThat = {
    init: function() {
      if (__isInitialized) return;
      __glFbo = GL.createFramebuffer();
      __isInitialized = true;
    },


    get_FBO: function() {
      return __glFbo;
    },


    bind_default: function(){
      GL.bindFramebuffer(GL.FRAMEBUFFER, __glFbo);
    },


    instance: function(spec){
      const _spec = Object.assign({}, __defaultSpec, spec);
     
      _spec.height = (_spec.height) ? _spec.height : _spec.width;
      let _glFbo = __glFbo,  _glRbo = null;

      let that = {
        add_depth: function() {
          if (_glRbo) return;

          _glFbo = GL.createFramebuffer();

          _glRbo = GL.createRenderbuffer();
          GL.bindRenderbuffer(GL.RENDERBUFFER, _glRbo);
          GL.bindFramebuffer(GL.FRAMEBUFFER, _glFbo);
          
          GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16 , _spec.width, _spec.height);
          GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, _glRbo);
        },


        bind: function(doClear, doSetVP) {
          GL.bindFramebuffer(GL.FRAMEBUFFER, _glFbo);
          if (doSetVP){
            GL.viewport(0, 0, _spec.width, _spec.height);
          }
          if(doClear){
            GL.clear(GL.COLOR_BUFFER_BIT);
          }
        },
        

        remove: function() {
          FBO.unbind();
          that = null;
        }
      }; //end that
      
      return that;
    }, //end instance()
    

    unbind: function() {
      GL.bindFramebuffer(GL.FRAMEBUFFER, null);
    },
    

    unbindAndSetFullScreen() {
      GL.bindFramebuffer(GL.FRAMEBUFFER, null);
      GL.viewport(0,0, Context.get_width(), Context.get_height());
    },
    

    unbindAndClear: function() {
      GL.bindFramebuffer(GL.FRAMEBUFFER, null);
      GL.viewport(0,0, Context.get_width(), Context.get_height());
      GL.clear(GL.COLOR_BUFFER_BIT);
    }
  };
  return superThat;
})();

