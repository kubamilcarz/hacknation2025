from pathlib import Path

from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.generics import CreateAPIView, ListCreateAPIView
from rest_framework.response import Response

from api.models import Document
from api.serializers import DocumentSerializer
from tools.pdf_mapper import map_pdf_fields_to_document_data
from tools.pdf_reader import PDFReader
from tools.pdf_writer import PDFWriter


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


class DocumentViewSet(ListCreateAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer



def generate_pdf_view(request):
    template_path = Path("tools/ewyp.pdf")
    writer = PDFWriter()

    request_data = request.POST or request.GET
    serializer = DocumentSerializer(data=request_data)
    if not serializer.is_valid():
        return HttpResponse(
            "Invalid document data", status=400, content_type="text/plain"
        )

    document = serializer.save()
    pdf_io = writer.fill_template(template_path, document)

    response = HttpResponse(pdf_io.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = "attachment; filename=filled.pdf"
    return response


def read_document_from_pdf_view(request):
    pdf = request.FILES["pdf"]
    reader = PDFReader()
    document = map_pdf_fields_to_document_data(reader.read_input_fields(pdf))
    serializer = DocumentSerializer(document)
    return Response(serializer.data)
