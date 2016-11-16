MyoGestures = function(){
  this.myo = require('myo');

  // eyeTribe instance
  this.eyetribe = getEyeTrackingInstance();
  this.eyetribe.setFrontendDisplay({
      'middleDivider': 720,
      'screen': {
          'width': 1440,
          'height': 900
      }
  });
  this.eyetribe.setPanels({
      'leftPanel': [],
      'rightPanel': []
  });

  // connects Myo to server
  this._init();
}



MyoGestures.prototype._init = function(){
  var self = this;
  self.myo.connect('com.noted.myo');

  //instantiate methods
  self._gestures();
}

// MyoGestures.prototype._lockProperty = function(){
//   var self = this;
//   this.myo.setLockingPolicy("none");
// }


//
MyoGestures.prototype._gestures = function(){
  var self = this;
  self.myo.on('pose', function(pose_name){
    if(pose_name === 'fingers_spread'){
      console.log("Pose: ", pose_name);
      console.log("Eyetribe " ,self.eyetribe.getFocusPanel());
    }

    if(pose_name === 'wave_out'){

    }

    if(pose_name === 'wave_in'){

    }

    if(pose_name === 'fist'){

    }

    if(pose_name === 'double_tap'){

    }
  });
}

var myoInstance = null;
getMyoInstance()._gestures();


function getMyoInstance(){
  if(myoInstance == null){
    myoInstance = new MyoGestures();
    console.log("Myo instance created");
  }
  return myoInstance;
}
