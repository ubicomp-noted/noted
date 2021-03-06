/**
TODO:
  1. [DONE] make average and standard dev private functions
  2. [DONE] correct getPoint() to use gazeAvg instead of gaze
  3. [DONE] implement getScrollPanel()
  4. give myo team example of getClosestBoundingBox
*/

// constructor
EyeTracking = function() {
    //vocabulary for consistency
    this.LEFT_PANEL = "leftPanel";
    this.RIGHT_PANEL = "rightPanel";
    this.TOP_PANEL = "top";
    this.BOTTOM_PANEL = "bottom";

    // testing only variable to turn off eyetracking
    this.isGreyOutAvailable = true;

    // received from PDF team
    this.panels = {
        'leftPanel': [],
        'rightPanel': []
    };
    this.frontendDisplay = null;

    // parameters
    this.eyetribe = require('eyetribe');
    this.intervalPerMilisecond = 100;
    this.timeTrackedMilisecond = 1000;
    this.gazeHistorySize = this.timeTrackedMilisecond / this.intervalPerMilisecond;
    this.stdevThreshX = 100; // TODO: we should find a way to make these numbers depend on the resolution of the display
    this.stdevThreshY = 100;
    this.greyOutTimeMS = 1500;

    // received by EyeTribe
    this.currentData = {
        'gaze': {
            'x': null,
            'y': null,
            'state' : null
        },
        'gazeAverage': null,
        'gazeHistory': [],
        'panelFocus': null,
        'closestBoundingBox': null,
        'scrollPosition' : null,
        'timeOffScreen' : 0
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
    var self = this;
    return {
        'position': self.currentData['scrollPosition']
    }
}

EyeTracking.prototype.getFocusPanel = function() {
    return this.currentData['panelFocus'];
}

EyeTracking.prototype.getPoint = function() {
    return this.currentData['gazeAverage'];
    //return {'stdevX': 0, 'stdevY': 0, 'x': 100, 'y': 100};
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
            'y': data.gaze_y,
            'state' : data.gaze_state
        };
        if (self._isLookingAtScreen()) {
            self._addGazeToHistory();
            self._decideFocus();
            self._decideScrollPosition();
            self._determineClosestBoundingBox();
        } 

        if (self._isLookingAtScreen() && self.currentData.gaze.state != "not_tracking") {
            self.currentData['timeOffScreen'] = 0;
        }else {
            self.currentData['timeOffScreen'] = self.currentData['timeOffScreen'] + self.intervalPerMilisecond;
        }
        toggleOpacityLayer(self.currentData['timeOffScreen'] >= self.greyOutTimeMS, !self.isGreyOutAvailable);
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
    } else if (self.currentData['gaze']['x'] > self.frontendDisplay['screen']['width'] || self.currentData['gaze']['y'] > self.frontendDisplay['screen']['height']) {
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

// determine whether the top or the bottom of panel is currently looked at
EyeTracking.prototype._decideScrollPosition = function() {
    var self = this;
    var middleYDivider = self.frontendDisplay['screen']['height'] / 2;
    if (self.currentData['gaze']['y'] <= middleYDivider)
        self.currentData['scrollPosition'] = self.TOP_PANEL;
    else
        self.currentData['scrollPosition'] = self.BOTTOM_PANEL;
}

EyeTracking.prototype._getStandardDeviation = function(gazeAvg) {
    var self = this;
    var stdevX = 0;
    var stdevY = 0;
    for (var i = 0; i < self.currentData['gazeHistory'].length; i++) {
        var currGaze = self.currentData['gazeHistory'][i];
        stdevX += Math.pow(currGaze['x'] - gazeAvg['x'], 2) / self.currentData['gazeHistory'].length;
        stdevY += Math.pow(currGaze['y'] - gazeAvg['y'], 2) / self.currentData['gazeHistory'].length;
    }
    stdevX = Math.sqrt(stdevX);
    stdevY = Math.sqrt(stdevY);
    return {'stdevX' : stdevX, 'stdevY': stdevY};
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

    // calcualte average
    for (var i = 0; i < self.currentData['gazeHistory'].length; i++) {
        var currGaze = self.currentData['gazeHistory'][i];
        gazeAvg['x'] += currGaze['x'] / self.currentData['gazeHistory'].length;
        gazeAvg['y'] += currGaze['y'] / self.currentData['gazeHistory'].length;
    }

    // calculate standard deviation
    standardDev = self._getStandardDeviation(gazeAvg);
    gazeAvg['stdevX'] = standardDev['stdevX'];
    gazeAvg['stdevY'] = standardDev['stdevY'];

    //get data based on user's eye focus
    var boundingBoxes = self.panels[self.LEFT_PANEL];


    // if the stdev is too high, this means that the user is looking all over the screen
    // in this case, we should not even attempt to match a closest bounding box
    // TODO: we should have a way of overriding this if the user has specifically asked
    // for a bounding box via gesture control
    if (gazeAvg['stdevX'] > self.stdevThreshX || gazeAvg['stdevY'] > self.stdevThreshY) {
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
        var localIndex = distanceResult['local_index']
        closestBoundingBox['index'] = closestIndex;
        closestBoundingBox['boundingBox'] = boundingBoxes[localIndex];
        closestBoundingBox['distance'] = distance;
        console.log("currently looking in bounding box " + closestIndex);
    }

    // update current data
    self.currentData['closestBoundingBox'] = closestBoundingBox;
    self.currentData['gazeAverage'] = gazeAvg;
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
        var distance = Math.sqrt((diffX * diffX) + (diffY * diffY));

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    }
    var result = {
        'index': boundingBoxes[closestIndex].id,
        'dist': closestDistance,
        'local_index': closestIndex
    };
    //console.log("closest bounding box " + closestIndex);

    return result;
}

// initiliaze first time
var eyeTrackingInstance = null;

// /* TODO: remove, just for testing */
// getEyeTrackingInstance().setFrontendDisplay({
//     'middleDivider': 960,
//     'screen': {
//         'width': 1920,
//         'height': 1080
//     }
// });
//
// getEyeTrackingInstance().setPanels({
//     'leftPanel': [{
//         'x': 0,
//         'y': 0,
//         'h': 500,
//         'w': 960
//     }, {
//         'x': 0,
//         'y': 540,
//         'h': 500,
//         'w': 960
//     }],
//     'rightPanel': []
// });

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
