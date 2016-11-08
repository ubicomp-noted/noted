// constructor
var fs = require('fs');
var path = require('path');

BoundingBoxes = function() {

    this.ANNOTATION_MARGIN = 400;
    this.ANNOTATION_ACTIVE = false;

    this.PDF = ""; //Where does this data exist?

    this.boundingBoxes = undefined; 
    this._init();
};

/* Public */

BoundingBoxes.prototype.getPanels = function() {
    return {};
};

BoundingBoxes.prototype.loadPageByReference = function(referenceNumber) {
    var currentReference = this.boundingBoxes.annotations[referenceNumber];
    return currentReference;
};

BoundingBox.prototype.getReferenceCoordinates = function(referenceNumber) {
    var current = this.boundingBoxes.annotations[referenceNumber];
    return {
        "bottomLeft": (current.x, current.y),
        "bottomRight": (current.x + current.w, current.y),
        "topLeft": (current.x, current.y + current.h),
        "topRight": (current.x + current.w, current.y + current.h)
    };
}

/* Private */
BoundingBoxes.prototype._setup = function() {
    //Get bounding box data, initially we will use JSON but move to database
    var exampleFilePath = path.resolve(__dirname, 'examples/bb_example.json');
    fs.readFile(exampleFilePath, function readFilePath(err, contents){
        this.boundingBoxes = JSON.parse(contents);
    });
};

BoundingBoxes.prototype._init = function() {
    var self = this;
    self.boundingBoxes = self._setup();
};