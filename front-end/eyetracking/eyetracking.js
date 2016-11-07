// option 1 how to make a class
EyeTracking = function() {
    this.test = "Blah some content";
    this.panels = null; //received from PDF team
    this.hname = "127.0.0.1";
    this.prt = 6555;
    this._init();
}

// ---- Public Functions exposed to the world ----
EyeTracking.prototype.getTest = function() {
    console.log("this is the prototype working " + this.test);
    var net = require('net');
    var client = net.createConnection({
        port: 6555
    }, () => {
        //'connect' listener
        console.log('connected to server!');
        client.write('world!\r\n');
    });
    client.on('data', (data) => {
        console.log(data.toString());
        client.end();
    });
    client.on('end', () => {
        console.log('disconnected from server');
    });
}

EyeTracking.prototype.setPanels = function(panels) {
    this.panels = panels;
}

EyeTracking.prototype.getReferenceNumber = function() {
    console.log("TODO: returning fake data");
    return {
        "referenceNumber": 1
    };
}

EyeTracking.prototype.getFocusPanel = function() {
    console.log("TODO: returning fake data");
    return {
        "panelNumber": 1
    };
}

// ---- Private Functions "hidden" to the world ----
EyeTracking.prototype._init = function() {
    console.log("EyeTracking initialize");
}

EyeTracking.prototype._hideMyPrivates = function() {
    console.log("Ssh people can't see me");
}

// option 2 how to make a class. I like first better think it looks cleaner
// function EyeTracking() {
//     this.test = "Test";
//     this.getTest = function() {
//         console.log("Working!");
//     }
// }

var eyeTrackingInstance = null;

// create eye tracking instance as a singleton so there are not multiple eyetracking classes being used.
function getEyeTrackingInstance() {
    if (eyeTrackingInstance == null)
        eyeTrackingInstance = new EyeTracking();
    return eyeTrackingInstance;
}
