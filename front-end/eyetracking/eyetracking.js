// constructor
EyeTracking = function() {
    //vocabulary for consistency
    this.LEFT_PANEL = "leftPanel";
    this.RIGHT_PANEL = "rightPanel";

    // received from PDF team
    this.panels = null;
    this.frontendDisplay = null;

    // parameters
    this.eyetribe = require('eyetribe');
    this.intervalPerMilisecond = 500;
    this.timeTrackedMilisecond = 3000;
    this.gazeHistorySize = this.timeTrackedMilisecond / this.intervalPerMilisecond;

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
}

EyeTracking.prototype.getClosestBoundingBox = function() {
    return this.currentData['closestBoundingBox'];
}

EyeTracking.prototype.getFocusPanel = function() {
    return this.currentData['panelFocus'];
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
    //get data based on user's eye focus
    var boundingBoxes = self.panels[self.currentData['panelFocus']];
    var closestBoundingBox = {
        'index': null,
        'boundingBox': null,
        'distance': null,
        'panelFocus': self.currentData['panelFocus']
    };
    for (var i = 0; i < boundingBoxes.length; i++) {
        //var coordinates = self._constructBoundingBoxCoordinates(boundingBoxes[i]);
        if (self._isUserLookingInBoundingBox(boundingBoxes[i])) {
            closestBoundingBox['index'] = i;
            closestBoundingBox['boundingBox'] = boundingBoxes[i]
            closestBoundingBox['distance'] = 0;
            //console.log("currently looking in bounding box " + i);
            break;
        }
        // else if finding distance from box
    }

    // update current referenceNumber
    self.currentData['closestBoundingBox'] = closestBoundingBox;
}

EyeTracking.prototype._isUserLookingInBoundingBox = function(boundingBox) {
    var self = this;
    //TODO: add logic for y coordinate
    var xOffset = boundingBox['x'] + boundingBox['w'];
    var yOffset = boundingBox['y'] - boundingBox['h'];
    var inX = false;
    var inY = false;
    //console.log("is " + self.currentData['gaze']['x'] + " between " + boundingBox['x'] + " and " + xOffset)
    if (self.currentData['gaze']['x'] >= boundingBox['x'] && self.currentData['gaze']['x'] <= xOffset)
        inX = true;
    if (self.currentData['gaze']['y'] >= boundingBox['y'] && self.currentData['gaze']['y'] <= yOffset)
        inY = true;
    if (inX && inY)
        return true;
    return false;
}

// initiliaze first time
var eyeTrackingInstance = null;

// TODO: remove, just for testing
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
