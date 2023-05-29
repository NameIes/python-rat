import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from monitors.models import Observable


class CommandConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        self.commands = {
            'connect': self.user_connected,
            'disconnect': self.user_disconnected,
            'send_tasklist': self.send_tasklist,
            'send_screenshot': self.send_screenshot,
            'tasklist_sended': self.tasklist_sended,
            'screenshot_sended': self.screenshot_sended,
            'send_ping': self.send_ping,
            'ping_sended': self.ping_sended,
            'activity_sended': self.activity_sended,
        }

        super().__init__(*args, **kwargs)

    def connect(self):
        async_to_sync(self.channel_layer.group_add)(
            'main_list', self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            'main_list', self.channel_name
        )

    def user_connected(self, request):
        """
        Request data:
          id: int      - User id
          command: str - Command to execute 'connect'

        Responce data:
          id: int       - User id
          command: str  - Command to execute 'connect'
          pc_name: str  - Name of client PC
          connect_time: str - PC startup time
          ip: str       - Client IP address
        """

        observable = Observable.objects.get(id=request['id'])
        context = {
            'id': request['id'],
            'command': request['command'],
            'pc_name': observable.pc_name,
            'connect_time': observable.connect_time.strftime("%m/%d/%Y, %H:%M:%S"),
            'ip': observable.ip,
        }

        self.send(text_data=json.dumps(context))

    def user_disconnected(self, request):
        """
        Request data:
          id: int      - User id
          command: str - Command to execute 'disconnect'

        Responce data:
          id: int      - User id
          command: str - Command to execute 'disconnect'
        """

        self.send(text_data=json.dumps(request))

    def send_ping(self, request):
        """
        Request data:
          id: int      - User id
          command: str - Command to execute 'send_ping'

        Responce data:
          id: int      - User id
          command: str - Command to execute 'send_ping'
        """

        self.send(text_data=json.dumps(request))

    def send_tasklist(self, request):
        """
        Request data:
          id: int      - User id
          command: str - Command to execute 'send_tasklist'

        Responce data:
          id: int       - User id
          command: str  - Command to execute 'send_tasklist'
        """

        self.send(text_data=json.dumps(request))

    def send_screenshot(self, request):
        """
        Request data:
          id: int      - User id
          command: str - Command to execute 'send_screenshot'

        Responce data:
          id: int       - User id
          command: str  - Command to execute 'send_screenshot'
        """

        self.send(text_data=json.dumps(request))

    def tasklist_sended(self, request):
        """
        Request data:
          id: int      - User id
          command: str - Command to execute 'tasklist_sended'
          tasks: str   - Stringified json list

        Responce data:
          id: int      - User id
          command: str - Command to execute 'tasklist_sended'
          tasks: str   - Stringified json list
        """

        self.send(text_data=json.dumps(request))

    def activity_sended(self, request):
        """
        Request data:
          id: int       - User id
          command: str  - Command to execute 'activity_sended'
          activity: str - Activity

        Responce data:
          id: int       - User id
          command: str  - Command to execute 'activity_sended'
          activity: str - Activity
        """

        self.send(text_data=json.dumps(request))

    def screenshot_sended(self, request):
        """
        Request data:
          id: int            - User id
          command: str       - Command to execute 'screenshot_sended'
          screenshot_id: int - ID of screenshot object

        Responce data:
          id: int             - User id
          command: str        - Command to execute 'screenshot_sended'
          screenshot_url: str - URL of screenshot
        """

        self.send(text_data=json.dumps(request))

    def ping_sended(self, request):
        """
        Request data:
          id: int            - User id
          command: str       - Command to execute 'ping_sended'

        Responce data:
          id: int             - User id
          command: str        - Command to execute 'ping_sended'
        """

        self.send(text_data=json.dumps(request))

    def parse_command(self, event):
        text_data_json = json.loads(event['message'])
        self.commands[text_data_json['command']](text_data_json)

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        async_to_sync(self.channel_layer.group_send)(
            'main_list', {
                'type': 'parse_command', 'message': text_data,
            }
        )
