from django.urls import path
from . import views


urlpatterns = [
    path("health/", views.health, name="health"),
    path("documents/", views.documents_view, name="documents"),
    # path("generate-pdf/", views.generate_pdf_view, name="generate-pdf"),
    # path("read-pdf/", views.read_document_from_pdf_view, name="read-pdf"),
]
