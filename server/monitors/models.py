from django.db import models


class Observable(models.Model):
    pc_name = models.CharField(max_length=64, blank=True, null=True)
    activity = models.DateTimeField(auto_now_add=True)
    ip = models.GenericIPAddressField(blank=True, null=True)


class Screenshot(models.Model):
    picture = models.ImageField()
