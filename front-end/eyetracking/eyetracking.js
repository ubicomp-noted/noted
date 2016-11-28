/**
TODO:
  1. make average and standard dev private functions
  2. correct getPoint() to use gazeAvg instead of gaze
  3.
*/

// constructor
EyeTracking = function() {
    //vocabulary for consistency
    this.LEFT_PANEL = "leftPanel";
    this.RIGHT_PANEL = "rightPanel";

    // received from PDF team
    this.panels = {
        'leftPanel' : [],
        'rightPanel' : []
    };
    this.frontendDisplay = null;

    // parameters
    this.eyetribe = require('eyetribe');
    this.intervalPerMilisecond = 100;
    this.timeTrackedMilisecond = 1000;
    this.gazeHistorySize = this.timeTrackedMilisecond / this.intervalPerMilisecond;
    this.stdevThreshX = 25; // TODO: we should find a way to make these numbers depend on the resolution of the display
    this.stdevThreshY = 10;

    // received by EyeTribe
    this.currentData = {
        'gaze': {
            'x': null,
            'y': null
        },
        'gazeHistory': [],
        'panelFocus': null,
        'closestBoundingBox': null
    };

    // initialize eye tracking logic
    this._init();
}

// ---- Public Functions exposed to the world ----
EyeTracking.prototype.setFrontendDisplay = function(frontendDisplay) {
    this.frontendDisplay = frontendDisplay;
}

EyeTracking.prototype.setPanels = function(panels) {
    this.panels = panels;
    console.log(this.panels);
}

EyeTracking.prototype.getClosestBoundingBox = function() {
    return this.currentData['closestBoundingBox'];
}

EyeTracking.prototype.getScrollPanel = function() {
    // TODO: give {position: top / bottom}
    return {'position' : 'bottom'}
}

EyeTracking.prototype.getFocusPanel = function() {
    return this.currentData['panelFocus'];
}

EyeTracking.prototype.getPoint = function() {
    // return average instead of gaze point
    return this.currentData['gaze'];
}

// ---- Private Functions "hidden" to the world ----
// set up EyeTribe and call interval logic to get updates from EyeTribe
EyeTracking.prototype._init = function() {

    var self = this;
    self.eyetribe.setup();
    setInterval(function() {
        var data = self.eyetribe.ping();
        self.currentData.gaze = {
            'x': data.gaze_x,
            'y': data.gaze_y
        };
        if (self._isLookingAtScreen()) {
            self._addGazeToHistory();
            self._decideFocus();
            self._determineClosestBoundingBox();
        } else {
            console.log("off the screen");
        }
    }, self.intervalPerMilisecond);

}

EyeTracking.prototype._addGazeToHistory = function() {
    var self = this;

    self.currentData['gazeHistory'].unshift(self.currentData['gaze']);

    if (self.currentData['gazeHistory'].length > self.gazeHistorySize)
        self.currentData['gazeHistory'].splice(self.currentData['gazeHistory'].length - 1, 1);

}


// determine whether the user is currently looking at the screen
EyeTracking.prototype._isLookingAtScreen = function() {
    var self = this;
    var isLookingAtScreen = true;
    if (self.currentData['gaze']['x'] == null || self.currentData['gaze']['y'] == null) {
        isLookingAtScreen = false; // the gaze is not init
    } else if (self.currentData['gaze']['x'] < 0 || self.currentData['gaze']['y'] < 0) {
        isLookingAtScreen = false; // the gaze is off the to the left or above the screen
    } else if (self.currentData['gaze']['x'] > self.frontendDisplay['screen']['x'] || self.currentData['gaze']['y'] > self.frontendDisplay['screen']['y']) {
        isLookingAtScreen = false; // the gaze is off to the right or below the screen
    }
    return isLookingAtScreen;
}

// determine whether the left panel or the right panel is currently in focus
EyeTracking.prototype._decideFocus = function() {
    var self = this;
    if (self.currentData['gaze']['x'] < self.frontendDisplay['middleDivider'])
        self.currentData['panelFocus'] = self.LEFT_PANEL;
    else
        self.currentData['panelFocus'] = self.RIGHT_PANEL;
    // console.log("_decideFocus: " + self.currentData['panelFocus'] + "\t" + self.currentData['gaze']['x'] + "\t" + self.frontendDisplay['middleDivider'])
}

EyeTracking.prototype._determineClosestBoundingBox = function() {
    var self = this;
    var closestBoundingBox = {
        'index': null,
        'boundingBox': null,
        'distance': null,
        'panelFocus': self.currentData['panelFocus']
    };

    // if there is no gaze history, stop right away--there's no bounding boxes to be found here
    if (self.currentData['gazeHistory'].length == 0) {
        self.currentData['closestBoundingBox'] = closestBoundingBox;
        return;
    }

    // TODO: make Gaze average its own function
    // TODO: make gaze average outside of the closestBoundingBox
    // average gaze history
    var gazeAvg = {
        'x': 0,
        'y': 0,
        'stdevX': 0,
        'stdevY': 0
    };

    // TODO: make these private functions
    // average
    for (var i = 0; i < self.currentData['gazeHistory'].length; i++) {
        var currGaze = self.currentData['gazeHistory'][i];
        gazeAvg['x'] += currGaze['x'] / self.currentData['gazeHistory'].length;
        gazeAvg['y'] += currGaze['y'] / self.currentData['gazeHistory'].length;
    }

    // stdev
    var stdevX = 0;
    var stdevY = 0;
    for (var i = 0; i < self.currentData['gazeHistory'].length; i++) {
        var currGaze = self.currentData['gazeHistory'][i];
        stdevX += Math.pow(currGaze['x'] - gazeAvg['x'], 2) / self.currentData['gazeHistory'].length;
        stdevY += Math.pow(currGaze['y'] - gazeAvg['y'], 2) / self.currentData['gazeHistory'].length;
    }
    gazeAvg['stdevX'] = Math.sqrt(stdevX);
    gazeAvg['stdevY'] = Math.sqrt(stdevY);

    //get data based on user's eye focus
    var boundingBoxes = self.panels[self.currentData['panelFocus']];

    // if the stdev is too high, this means that the user is looking all over the screen
    // in this case, we should not even attempt to match a closest bounding box
    // TODO: we should have a way of overriding this if the user has specifically asked
    // for a bounding box via gesture control
    if (gazeAvg['stdevX'] > stdevThreshX || gazeAvg['stdevY'] > stdevThreshY) {
        self.currentData['closestBoundingBox'] = closestBoundingBox;
        return;
    }

    var lookingInBoxFound = false;
    for (var i = 0; i < boundingBoxes.length; i++) {
        //var coordinates = self._constructBoundingBoxCoordinates(boundingBoxes[i]);
        if (self._isUserLookingInBoundingBox(boundingBoxes[i], gazeAvg)) {
            closestBoundingBox['index'] = i;
            closestBoundingBox['boundingBox'] = boundingBoxes[i]
            closestBoundingBox['distance'] = 0;
            console.log("currently looking in bounding box " + i);
            lookingInBoxFound = true;
            break;
        }
    }

    if (!lookingInBoxFound) {
        var distanceResult = self._computeClosestBoundingBox(boundingBoxes, gazeAvg);
        var closestIndex = distanceResult['index'];
        var distance = distanceResult['dist'];
        closestBoundingBox['index'] = closestIndex;
        closestBoundingBox['boundingBox'] = boundingBoxes[closestIndex];
        closestBoundingBox['distance'] = distance;
        console.log("currently looking in bounding box " + closestIndex);
    }

    // update current referenceNumber
    self.currentData['closestBoundingBox'] = closestBoundingBox;
}

EyeTracking.prototype._isUserLookingInBoundingBox = function(boundingBox, gazeAvg) {
    var self = this;

    // left is 0 px and right is infinity px
    var xOffset = boundingBox['x'] + boundingBox['w'];

    // top is 0 px and bottom is infinity px
    var yOffset = boundingBox['y'] + boundingBox['h'];
    var inX = false;
    var inY = false;
    //console.log("is " + self.currentData['gaze']['x'] + " between " + boundingBox['x'] + " and " + xOffset)
    //if (self.currentData['gaze']['x'] >= boundingBox['x'] && self.currentData['gaze']['x'] <= xOffset)
    if (gazeAvg['x'] >= boundingBox['x'] && gazeAvg['x'] <= xOffset)
        inX = true;
    //if (self.currentData['gaze']['y'] >= boundingBox['y'] && self.currentData['gaze']['y'] <= yOffset)
    if (gazeAvg['y'] >= boundingBox['y'] && gazeAvg['y'] <= yOffset)
        inY = true;
    if (inX && inY)
        return true;
    return false;
}

EyeTracking.prototype._computeClosestBoundingBox = function(boundingBoxes, gazeAvg) {
    var self = this;

    // x coord: left is 0 px and right is infinity px
    // y coord: top is 0 px and bottom is infinity px

    var closestIndex = -1;
    var closestDistance = Infinity;
    for (var i = 0; i < boundingBoxes.length; i++) {

        // center coordinate of the bounding box
        var boundingBox = boundingBoxes[i];
        var centerX = boundingBox['x'] + (boundingBox['w'] * 0.5);
        var centerY = boundingBox['y'] + (boundingBox['h'] * 0.5);

        var diffX = centerX - gazeAvg['x'];
        var diffY = centerY - gazeAvg['y'];
        var distance = Math.sqrt((diffX * diffX) + (diffY*diffY));

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
    }
    var result = {
      'index': closestIndex,
      'dist': closestDistance
    };

    return result;
}

// initiliaze first time
var eyeTrackingInstance = null;

// /* TODO: remove, just for testing */

// create eye tracking instance as a singleton so there are not multiple eyetracking classes being used.
function getEyeTrackingInstance() {
    if (eyeTrackingInstance == null)
        eyeTrackingInstance = new EyeTracking();
    return eyeTrackingInstance;
}

//currently not using, might want it eventually
EyeTracking.prototype._constructBoundingBoxCoordinates = function(boundingBox) {
    var topLeft = {
        'x': boundingBox['x'],
        'y': boundingBox['y']
    }
    var topRight = {
        'x': boundingBox['x'] + boundingBox['w'],
        'y': boundingBox['y']
    }
    var bottomLeft = {
        'x': boundingBox['x'],
        'y': boundingBox['y'] - boundingBox['h']
    }
    var topRight = {
        'x': boundingBox['x'] + boundingBox['w'],
        'y': boundingBox['y'] - boundingBox['h']
    }
    return {
        'topLeft': topLeft,
        'topRight': topRight,
        'bottomLeft': topLeft,
        'bottomRight': topRight
    }
}
