from django.urls import path
from monitors import views
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('', views.index),
    path('get_id/', views.get_id),
    path('get_observables/', views.get_observables),
    path('save_picture/', views.save_picture),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
