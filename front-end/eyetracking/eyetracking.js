// constructor
EyeTracking = function() {
    //vocabulary for consistency
    this.LEFT_PANEL = "leftPanel";
    this.RIGHT_PANEL = "rightPanel";

    // received from PDF team
    this.panels = null;
    this.frontendDisplay = null;

    // parameters
    this.hname = "127.0.0.1"; //currently not used
    this.prt = 6555; // currently not used
    this.eyetribe = require('eyetribe');
    this.intervalPerMilisecond = 500;

    // received by EyeTribe
    this.currentData = {
        'gaze': {
            'x': null,
            'y': null
        },
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
        self._decideFocus();
        self._determineClosestBoundingBox();
    }, self.intervalPerMilisecond);

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
        'panelFocus' : self.currentData['panelFocus']
    };
    for (var i = 0; i < boundingBoxes.length; i++) {
        //var coordinates = self._constructBoundingBoxCoordinates(boundingBoxes[i]);
        if (self._isUserLookingInBoundingBox(boundingBoxes[i])) {
            closestBoundingBox['index'] = i;
            closestBoundingBox['boundingBox'] = boundingBoxes[i]
            closestBoundingBox['distance'] = 0;
            break;
        }
        console.log("currently looking in bounding box " + i);
        // else if finding distance from box
    }

    // update current referenceNumber
    self.currentData['closestBoundingBox'] = closestBoundingBox;
}

EyeTracking.prototype._isUserLookingInBoundingBox = function(boundingBox) {
    var self = this;
    //TODO: add logic for y coordinate
    var xOffset = boundingBox['x'] + boundingBox['w'];
    // console.log("is " + self.currentData['gaze']['x'] + " between " + boundingBox['x'] + " and " + xOffset)
    if (self.currentData['gaze']['x'] >= boundingBox['x'] && self.currentData['gaze']['x'] <= xOffset)
        return true;
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

// initiliaze first time
var eyeTrackingInstance = null;

// TODO: remove, just for testing
// getEyeTrackingInstance().setFrontendDisplay({
//     'middleDivider': 2000
// });
//
// getEyeTrackingInstance().setPanels({
//     'leftPanel': [{
//         'x': 0,
//         'y': 0,
//         'h': 1000,
//         'w': 1000
//     }, {
//         'x': 1000,
//         'y': 1000,
//         'h': 1000,
//         'w': 1000
//     }],
//     'rightPanel': []
// });

// create eye tracking instance as a singleton so there are not multiple eyetracking classes being used.
function getEyeTrackingInstance() {
    if (eyeTrackingInstance == null)
        eyeTrackingInstance = new EyeTracking();
    return eyeTrackingInstance;
}
