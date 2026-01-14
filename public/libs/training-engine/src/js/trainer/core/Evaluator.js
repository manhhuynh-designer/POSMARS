const Evaluator = (function(){

  const __modes = {
    'MAXSUCCESSRATE_MINERROR': 1,
    'MAXSUCCESSRATE': 2,
    'MINERROR': 3
  };


  return {
    instance: function(evaluatorType){
      const _mode = __modes[evaluatorType];
      
      //PRECOMPILER_BEGINLOG
      if (!_mode){
        throw new Error ('Unknow evaluator type for current problem');
      }
      //PRECOMPILER_ENDLOG
      const _bestTest = {
        maxSuccessRate: -1,
        minError: 1e12,
        testsResult: null,
        ind: -1
      };

      //PRECOMPILER_BEGINDELETE
      const _lastTest = {
        ind: -1,
        testsResult: null
      };
      //PRECOMPILER_ENDDELETE

      let _counter = 0;


      const _isConsiderError = [
        __modes['MAXSUCCESSRATE_MINERROR'],
        __modes['MINERROR']
        ].includes(_mode);


      function check_isValidNumValue(v){
        return (!isNaN(v) && v !== -Infinity && v !== Infinity);
      }


      function is_bestTestMaxSuccessRate(testsResult, evaluation){
        const successRate = testsResult.successRate;

        evaluation.isBest = (successRate > _bestTest.maxSuccessRate);
        evaluation.value = successRate;

        if ( evaluation.isBest){
          _bestTest.maxSuccessRate = successRate;
        }
      }


      function is_bestTestMaxSuccessRateMinError(testsResult, evaluation){
        if (!testsResult.isError){
          //PRECOMPILER_BEGINLOG
          console.log('WARNING in Evaluator.js - is_bestTestMaxSuccessRateMinError(): no error to benchmark the test');
          //PRECOMPILER_ENDLOG
          return;
        }

        const successRate = testsResult.successRate;
        const error = testsResult.error;
        evaluation.value = error;

        if (!check_isValidNumValue(error)){
          throw new Error('Invalid error value in Evaluator: error =' + error.toString());
        }
        if (!check_isValidNumValue(successRate)){
          throw new Error('Invalid error value in Evaluator: successRate =' + successRate.toString());
        }

        if (successRate > _bestTest.maxSuccessRate){
          _bestTest.maxSuccessRate  = successRate;
          _bestTest.minError = error;
          evaluation.isBest = true;
          return;
        }

        if (successRate === _bestTest.maxSuccessRate && error <= _bestTest.minError){
          _bestTest.minError = error;
          evaluation.isBest = true;
        }
      }


      function is_bestTestMinError(testsResult, evaluation){
        if (!testsResult.isError){
          //PRECOMPILER_BEGINLOG
          console.log('WARNING in Evaluator.js - is_bestTestMinError(): no error to benchmark the test');
          //PRECOMPILER_ENDLOG
          return;
        }
        const error = testsResult.error

        evaluation.isBest = (error < _bestTest.minError);
        evaluation.value = error;

        if(evaluation.isBest){
          _bestTest.minError = error;
        }        
      }


      const that = {
        is_bestTest: function(testsResult){
          const evaluation = {
            isBest: false,
            value: -1
          };
          switch(_mode){
            case __modes['MAXSUCCESSRATE_MINERROR']:
              is_bestTestMaxSuccessRateMinError(testsResult, evaluation);
              break;

            case __modes['MAXSUCCESSRATE']:
              is_bestTestMaxSuccessRate(testsResult, evaluation);
              break;

            case __modes['MINERROR']:
              is_bestTestMinError(testsResult, evaluation);
              break;

            default:
              throw new Error('Unknow evaluation type: ' + evaluation.toString());
          }

          //PRECOMPILER_BEGINDELETE
          _lastTest.testsResult = Object.assign({}, testsResult);
          _lastTest.ind = _counter;
          //PRECOMPILER_ENDDELETE

          if (evaluation.isBest){
            _bestTest.testsResult = Object.assign({}, testsResult);
            _bestTest.ind = _counter;
          }
          ++_counter;

          //debugger;
          return evaluation;
        },


        is_considerError: function(){
          return _isConsiderError;
        }


        //PRECOMPILER_BEGINDELETE
        ,get_last: function(){
          return _lastTest;
        },

        get_best: function(){
          return _bestTest;
        }
        //PRECOMPILER_ENDDELETE
      } // end that

      //PRECOMPILER_BEGINDELETE
      window.debugEvaluator = that;
      //PRECOMPILER_ENDDELETE
      
      return that;
    } // end instance()
  }
})(); 

