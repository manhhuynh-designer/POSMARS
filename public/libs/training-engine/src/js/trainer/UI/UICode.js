const UICode = (function() {
  let _jqTextarea = null, _domTextarea = null, _editor = null;
  let _code = null, _codeFileName = 'undefined';

  let _timerResize = null;
  
  const update_size = function(){
    if (!_editor){
      return;
    }
    if (_timerResize){
      clearTimeout(_timerResize);
    }
    _editor.setSize(0, "auto");
    _timerResize = setTimeout(function(){
      _editor.setSize($('#codeview').width(), "auto");
      _timerResize = null;
    }, 40);
  }


  function get_currentTrainer(){
    return Trainer.prototype.current;
  }


  const that = {
    get_fileName: function(){
      return _codeFileName;
    },


    toggle_running: function(isRunning){ // launched by trainer to tell that loading is finished
      if (isRunning){
        UI.set_status('running...');
      } else {
        UI.set_status('stopped');
      }
    },

    
    init: function() {
      $('#fileOpenInput').change(that.open_file);

      _jqTextarea = $("#codeviewTextarea");
      _domTextarea = _jqTextarea.get(0);

      _editor = CodeMirror.fromTextArea(_domTextarea, {
        lineNumbers: true,
        matchBrackets: true,
        theme: 'cobalt',
        continueComments: "Enter",
        extraKeys: {
          "Ctrl-Q": "toggleComment",
          "F11": function(cm) {
            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
          },
          "Esc": function(cm) {
            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
          }
        }, //end extraKeys
        mode: "javascript",
        smartIndent: true,
        indentWithTabs: false,
        lineWrapping: true, // not scroll hzt when long line
        viewportMargin: Infinity,
        gutters: ["CodeMirror-lint-markers"],
        lint: true
      }); //end editor.fromTextArea

      // open from URL parameter:
      const urlParsed = lib_url.parse_current();
      const initialTrainingScript = urlParsed['code'] || 'empty.js';
      that.open_fromURL('trainingScripts/' + initialTrainingScript);

      window.addEventListener('resize', update_size);
      window.debugCodeEditor = _editor;
    }, //end init()


    run: function(){
      _code = _editor.getValue();
      Trainer.train(_code);
    },


    save: function(){
      if (!_code) {
        alert('Nothing to save. Plz RUN the code and do not STOP it ! (you can pause it)');
        return;
      }

      // save the code
      const codeFileName = _codeFileName + '_' + lib_date.get_YYYYMMDD() + '.json'
      const name = window.prompt('Name of the downloaded file: ', codeFileName);
      if (!name) {
        return;
      }

      // save the textures
      const NNObj = get_currentTrainer().export_toJSON();
      console.log('INFO in UICode.JS - save: Pack neuron network to a JSON string');
      NNObj['code'] = _editor.getValue(); // save the code too
      NNObj['infos'] =  Trainer.get_infos();
      const NNTxt = JSON.stringify(NNObj);
      lib_ajax.download(NNTxt, name);
    },


    // load a JavaScript training script using AJAX:
    open_fromURL: function(url) {
      _codeFileName = lib_url.get_fileNameNoExt(url);
      $.ajax({
        url: url,
        method: 'GET',
        dataType: 'text',
        async: true,
        cache: false
      }).success(function(bodyJSCode) {
        const jsCode = [
          '/*jshint esversion: 6 */',
          bodyJSCode
        ];
        _editor.setValue(jsCode.join('\n'));
      }); //end ajax call
    },


    // Open a backup (model + code):
    open_file: function(e) {
      $('#fileOpen').hide();
      if (Trainer.is_training()) {
        alert('The trainer is still running. Please stop it before opening a new file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const model = JSON.parse(e.target.result);
        if (!model['code']){
          alert('This model file seems to be quantizated. It cannot be opened');
          return;
        }
        _editor.setValue(model['code']);
        update_size(); // fix a bug, when open a file and run codemirror becomes huge

        if (!$('#fileOpenCodeOnly').get(0).checked){
          console.log('INFO in UICode.js: Inport all neural network data');
          NeuronNetwork.prototype.set_layers(model['layers']);
        }
      }; // end reader.onload
      reader.readAsText(e.target.files[0]);
    }

  }; //end that

  return that;
})();