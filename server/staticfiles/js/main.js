let app = new Vue({
  el: '#usersWrapper',
  delimiters: ['[[', ']]'],
  data: {
    chat_socket: new WebSocket(
      'ws://'
      + window.location.host
      + '/ws/list/'
    ),
    users_list: [],
    tasks: [],
    sc_url: '',
  },
  methods: {
    sendCommand: function (data) {
      this.chat_socket.send(JSON.stringify(data));
    },

    getTasklist: function (user_id) {
      this.sendCommand({
        id: user_id,
        command: 'send_tasklist',
      })
    },

    getScreenshot: function (user_id) {
      this.sendCommand({
        id: user_id,
        command: 'send_screenshot',
      })
    },

    onUserConnected: function (data) {
      `
      id: int       - User id
      command: str  - Command to execute 'connect'
      pc_name: str  - Name of client PC
      activity: str - PC startup time
      ip: str       - Client IP address
      `
      delete data.command;
      this.users_list.push(data);
    },

    onUserDisconnected: function (data) {
      `
      id: int      - User id
      command: str - Command to execute 'disconnect'
      `
      for (let i = 0; i < this.users_list.length; i++) {
        if (this.users_list[i].id === data.id) {
          this.users_list.splice(i, 1);
          return;
        };
      };
    },

    onScreenshotSended: function (data) {
      `
      id: int             - User id
      command: str        - Command to execute 'screenshot_sended'
      screenshot_url: str - URL of screenshot
      `
      const responseModal = new bootstrap.Modal(document.getElementById('scModal'));
      responseModal.show();
      this.sc_url = data.screenshot_url;
    },

    onTasklistSended: function (data) {
      `
      id: int      - User id
      command: str - Command to execute 'tasklist_sended'
      tasks: str   - Stringified json list
      `
      const responseModal = new bootstrap.Modal(document.getElementById('responseModal'));
      responseModal.show();
      let splitted = data.tasks.split('\r\n');
      let result = [];
      for (let i = 0; i < splitted.length; i++) {
        let splitted_line = splitted[i].match(
          /(.+?) +(\d+) (.+?) +(\d+) +(\d+.* K).*/
        );
        if (splitted_line !== null) result.push(splitted_line);
      };
      this.tasks = result;
    },

    parseCommand: function (data) {
      let commands = {
        'connect': (data) => this.onUserConnected(data),
        'disconnect': (data) => this.onUserDisconnected(data),
        'screenshot_sended': (data) => this.onScreenshotSended(data),
        'tasklist_sended': (data) => this.onTasklistSended(data),
      };

      data = JSON.parse(data);
      if (data.command in commands) commands[data.command](data);
    },
  },
  mounted: function () {
    this.chat_socket.onmessage = (e) => {
      this.parseCommand(e.data);
    };

    this.chat_socket.onclose = function (e) {
      console.error('Chat socket closed unexceptedly.');
    }

    axios({
      method: 'get',
      url: '/get_observables/',
    }).then((response) => {
      this.users_list = response.data;
    });
  },
});