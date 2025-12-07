from django.urls import path
from . import views


urlpatterns = [
    path("health/", views.health, name="health"),
    path("documents/", views.documents_view, name="documents"),
    # path("upload-pdf/", views.upload_pdf_view, name="upload-pdf"),
    path("user-recommendation/", views.user_recommendation_view, name="user-recommendation"),
    path("zus-recommendation/", views.zus_recommendation_view, name="zus-recommendation"),
    # path("generate-pdf/", views.generate_pdf_view, name="generate-pdf"),
    # path("read-pdf/", views.read_document_from_pdf_view, name="read-pdf"),
]
