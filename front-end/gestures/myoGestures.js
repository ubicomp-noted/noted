MyoGestures = function(){
  this.myo = require('myo');

  // eyeTribe instance
  this.eyetribe = getEyeTrackingInstance();
  // this.eyetribe.setFrontendDisplay({
  //     'middleDivider': 720,
  //     'screen': {
  //         'width': 1440,
  //         'height': 900
  //     }
  // });
  // this.eyetribe.setPanels({
  //     'leftPanel': [],
  //     'rightPanel': []
  // });

  // connects Myo to server
  this._init();
}

MyoGestures.prototype._init = function(){
  var self = this;
  self.myo.connect('com.noted.myo');


}

MyoGestures.prototype._gestures = function(){
  var self = this;
  self.myo.on('pose', function(pose_name){
    if(pose_name === 'fist'){
      var scrollPanel = self.eyetribe.getScrollPanel().position;
      if(scrollPanel === 'bottom'){
        upGesture();
      }
      else if(scrollPanel === 'top'){
        downGesture();
      }
      else{
        console.log("Off screen, pleaes look at screen to determine which way to scroll");
      }
      console.log("Pose: ", pose_name);
    }

    // Wave_out will generate the annotations
    if(pose_name === 'wave_out'){
      rightGesture(self.eyetribe.getClosestBoundingBox());
      console.log(self.eyetribe.getClosestBoundingBox());
    }

    if(pose_name === 'wave_in'){
      leftGesture();
      // call handleInput("left");
    }

    // Additional Gestures are available(fist, double_tap)
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
