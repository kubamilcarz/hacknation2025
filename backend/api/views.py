from rest_framework.decorators import api_view
from rest_framework.generics import CreateAPIView, ListCreateAPIView
from rest_framework.response import Response

from api.models import Document
from api.serializers import DocumentSerializer


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


class DocumentViewSet(ListCreateAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

