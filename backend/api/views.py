from pathlib import Path
import json

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.serializers import DocumentSerializer
from tools.pdf_mapper import map_pdf_fields_to_document_data
from tools.pdf_reader import PDFReader
from tools.pdf_writer import PDFWriter


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


# class DocumentViewSet(ListCreateAPIView):
#     queryset = Document.objects.all()
#     serializer_class = DocumentSerializer


@csrf_exempt
def documents_view(request):
    if request.content_type == 'application/json':
        try:
            request_data = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse("Invalid JSON data", status=400, content_type="text/plain")
    else:
        request_data = request.POST or request.GET

    action = request_data.get("action")

    if action == "create":
        serializer = DocumentSerializer(data=request_data)
        if not serializer.is_valid():
            return HttpResponse(
                "Invalid document data", status=400, content_type="text/plain"
            )

        document = serializer.save()
        return Response(data=DocumentSerializer(document).data)

    if action == "generate-pdf":
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

    if action == "generate-pdf-anonymized":
        template_path = Path("tools/ewyp.pdf")
        writer = PDFWriter()

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
    return HttpResponse("Invalid action", status=400, content_type="text/plain")


def read_document_from_pdf_view(request):
    pdf = request.FILES["pdf"]
    reader = PDFReader()
    document = map_pdf_fields_to_document_data(reader.read_input_fields(pdf))
    serializer = DocumentSerializer(document)
    return Response(serializer.data)
