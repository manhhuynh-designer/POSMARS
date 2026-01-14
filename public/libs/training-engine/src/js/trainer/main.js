$(document).ready(function() {
  if (location.href.includes('file://')){
    alert('Please do not open this file directly. You should serve it using a static HTTP server.');
    return;
  }

  if (!Trainer.init()){
    console.log('FATAL Error: cannot init the Trainer');
  };
});