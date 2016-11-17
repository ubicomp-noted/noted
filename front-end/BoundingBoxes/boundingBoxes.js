// constructor
var fs = require('fs');
var path = require('path');

BoundingBoxes = function() {
    this.bbData = undefined;
    this.eyeTribe = undefined;
    this.ANNOTATION_MARGIN = 400;
    this.ANNOTATION_ACTIVE = false;

    this.PDF = ""; //Where does this data exist?

    this._init();
    
};

/* Public */
BoundingBoxes.prototype._init = function() {
    var self = this;
    self._setup();
    self.eyeTribe = getEyeTrackingInstance();
    self.eyeTribe.setFrontendDisplay({
        'middleDivider': 960,
        'screen': {
            'width': 1920,
            'height': 1080
        }
    });
    getEyeTrackingInstance().setPanels({
        'leftPanel': self.getCurrentBoundingBoxes(),
        'rightPanel': []
    });
};

//todo make this work for whole page
BoundingBoxes.prototype.getCurrentBoundingBoxes = function(){
    var self = this;
    var totalBoundingBoxes = self.bbData;
    console.log(totalBoundingBoxes);
    var filtered = [];
    var currentPageHeight = document.getElementById("outerContainer").getBoundingClientRect().height;
    for(var i = 0; i < totalBoundingBoxes.length; i++) {
        var current = self.getAbsoluteReferenceCoord(totalBoundingBoxes[i].number);
        if(current.y >= 0 && (current.y + current.h) < currentPageHeight) {
            filtered.push(current);
        }
    }
    return filtered;
};

BoundingBoxes.prototype.getAbsoluteReferenceCoord = function(bbID){
  var boundingBox = document.getElementById(bbID);
  var page = document.getElementById("outerContainer");
  var boundingRect = boundingBox.getBoundingClientRect();
  var pageRect = page.getBoundingClientRect();
  return {
    "x" : boundingRect["left"] - pageRect["left"],
    "y" : boundingRect["top"]  - pageRect["top"],
    "w" : boundingRect["width"],
    "h" : boundingRect["height"]
  }
};

BoundingBoxes.prototype.getAbsolutePageCoord = function(pageID){
  var page = document.getElementById(pageID);
  var pageRect = page.getBoundingClientRect();
  return {
    "x" : pageRect["left"],
    "y" : pageRect["top"],
    "w" : pageRect["width"],
    "h" : pageRect["height"]
  }
}

BoundingBoxes.prototype.getPanels = function() {
    return {};
};

BoundingBoxes.prototype.loadPageByReference = function(referenceNumber) {
    var currentReference = this.boundingBoxes.annotations[referenceNumber];
    //TODO Do something with reference and page
    return {"output": false};
};

BoundingBoxes.prototype.getReferenceData = function(referenceNumber) {
    var currentReference = this.boundingBoxes.annotations[referenceNumber];
    return currentReference;
};

BoundingBoxes.prototype.genBoundingBoxes = function() {
  var accumulator = [];
  var i = 0;
  for(var bb = 0; bb < BOUNDING_BOXES.length; bb++) {
    var bb_iter = BOUNDING_BOXES[bb];
    var bb_obj = document.createElement('div');
    bb_obj.style.width = bb_iter.w + '%';
    bb_obj.style.height = bb_iter.h + '%';
    bb_obj.style.top = bb_iter.y + '%';
    bb_obj.style.left = bb_iter.x + '%';
    bb_obj.classList.add('boundingBox');
    bb_obj.id = 'bb_' + i;
    accumulator.push(bb_obj);
    i++;
  }
  return accumulator;
}
/* Private */
BoundingBoxes.prototype._setup = function() {
    //Get bounding box data, initially we will use JSON but move to database
    var self = this;
    var exampleFilePath = path.resolve(__dirname, 'examples/new_schema.json');
    var file_json = JSON.parse(fs.readFileSync(exampleFilePath, 'utf8'));
    self.bbData = file_json.annotations;
    console.log(self.bbData);
};
