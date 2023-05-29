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
    activity_timeout: null,
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

    getActive: function (user_id) {
      this.sendCommand({
        id: user_id,
        command: 'send_ping',
      })
    },

    onUserConnected: function (data) {
      `
      id: int       - User id
      command: str  - Command to execute 'connect'
      pc_name: str  - Name of client PC
      connect_time: str - PC startup time
      ip: str       - Client IP address
      `
      delete data.command;
      data.is_active = true;
      data.current_activity = 'Connected';
      data.last_activity = Date.now();
      for (let i = 0; i < this.users_list.length; i++) {
        if (this.users_list[i].id === data.id) {
          this.$set(this.users_list, i, data);
          return;
        };
      };
      this.users_list.push(data);
    },

    onUserDisconnected: function (data) {
      `
      id: int      - User id
      command: str - Command to execute 'disconnect'
      `
      for (let i = 0; i < this.users_list.length; i++) {
        if (this.users_list[i].id === data.id) {
          this.users_list[i].is_active = false;
          this.users_list[i].current_activity = 'Disconnected';
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
      this.sc_url = data.screenshot_url;
      const responseModal = new bootstrap.Modal(document.getElementById('scModal'));
      responseModal.show();
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

    onPingSended: function (data) {
      `
      id: int      - User id
      command: str - Command to execute 'ping_sended'
      `
      for (let i = 0; i < this.users_list.length; i++) {
        if (this.users_list[i].id === data.id) {
          data = this.users_list[i];
          data.is_active = true;
          data.last_activity = Date.now();
          this.$set(this.users_list, i, data);
          return;
        };
      };
    },

    onActivitySended: function (data) {
      `
      id: int      - User id
      command: str - Command to execute 'activity_sended'
      activity: str - Activity
      `
      if (this.activity_timeout) clearTimeout(this.activity_timeout);

      for (let i = 0; i < this.users_list.length; i++) {
        if (this.users_list[i].id === data.id) {
          let ndata = this.users_list[i];
          ndata.is_active = true;
          ndata.current_activity = data.activity;
          ndata.last_activity = Date.now();
          this.$set(this.users_list, i, ndata);
          this.activity_timeout = setTimeout(() => {
            const delta = Math.floor((Date.now() - this.users_list[i].last_activity) / 1000);

            if (delta > 10) {
              this.users_list[i].is_active = false;
              this.users_list[i].current_activity = 'Disconnected';
            };
          }, 11000);
          return;
        };
      };
    },

    parseCommand: function (data) {
      let commands = {
        'connect': (data) => this.onUserConnected(data),
        'disconnect': (data) => this.onUserDisconnected(data),
        'screenshot_sended': (data) => this.onScreenshotSended(data),
        'tasklist_sended': (data) => this.onTasklistSended(data),
        'ping_sended': (data) => this.onPingSended(data),
        'activity_sended': (data) => this.onActivitySended(data),
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
      for (let i = 0; i < this.users_list.length; i++) {
        this.users_list[i].is_active = false;
        this.users_list[i].current_activity = 'Nothing';
        this.users_list[i].last_activity = Date.now();
        this.getActive(this.users_list[i].id);
      };
    });
  },
});