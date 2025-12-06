from django.urls import path
from . import views


urlpatterns = [
    path("health/", views.health, name="health"),
    path("documents/", views.DocumentViewSet.as_view(), name="documents")
]
