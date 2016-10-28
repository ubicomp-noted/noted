'use strict';

const qs = require ("querystring");
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var pdfWindow = null;
var noteWindow = null;

const pdfURL = "http://andrewd.ces.clemson.edu/research/vislab/docs/BET107cr.pdf";

app.on('ready', function() {
  pdfWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  const param = qs.stringify({file: pdfURL});

  pdfWindow.loadURL('file://' + __dirname + '/pdfjs/web/viewer.html?' + param);
  pdfWindow.webContents.openDevTools();

  pdfWindow.on('closed', function() {
    pdfWindow = null;
  });
});
