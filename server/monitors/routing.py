from django.urls import re_path

from monitors import consumers


websocket_urlpatterns = [
    re_path("ws/list/", consumers.CommandConsumer.as_asgi()),
]
