from pathlib import Path
import json

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.serializers import DocumentSerializer
from tools.chatgpt import ChatGPTClient
from tools.pdf_mapper import map_pdf_fields_to_document_data, map_document_to_pdf_fields
from tools.pdf_reader import PDFReader
from tools.pdf_writer import PDFWriter
from tools.ocr import ocr_img, ocr_pdf
from pytesseract import TesseractNotFoundError


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
        return JsonResponse(DocumentSerializer(document).data, safe=False)

    if action == "generate-pdf":
        template_path = Path("tools/ewyp.pdf")
        writer = PDFWriter()

        serializer = DocumentSerializer(data=request_data)
        if not serializer.is_valid():
            return HttpResponse(
                "Invalid document data", status=400, content_type="text/plain"
            )

        document = serializer.save()
        pdf_io = writer.fill_template(template_path, map_document_to_pdf_fields(document))

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
    return JsonResponse(serializer.data, safe=False)


@csrf_exempt
def ocr_images_view(request):
    if request.method != "POST":
        return HttpResponse("Only POST allowed", status=405, content_type="text/plain")

    # Accept multiple files under key 'images'. Also support single 'image'.
    files = request.FILES.getlist("images")
    if not files and "image" in request.FILES:
        files = [request.FILES["image"]]

    if not files:
        return HttpResponse("No images uploaded. Use field 'images' (multiple) or 'image' (single).", status=400, content_type="text/plain")

    lang = request.POST.get("lang") or request.GET.get("lang") or "pol"

    try:
        results = ocr_img(files, lang=lang)
    except TesseractNotFoundError:
        msg = (
            "Tesseract OCR binary not found.\n"
            "Install Tesseract and ensure it's on PATH, or set env var TESSERACT_CMD to the binary path.\n"
            "Examples: Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-pol; "
            "macOS: brew install tesseract; Windows: install from https://github.com/UB-Mannheim/tesseract/wiki"
        )
        return HttpResponse(msg, status=500, content_type="text/plain")
    except ValueError as e:
        # Likely missing language data
        return HttpResponse(str(e), status=500, content_type="text/plain")
    except Exception as e:
        return HttpResponse(f"OCR failed: {e}", status=500, content_type="text/plain")

    return JsonResponse({"lang": lang, "results": results}, safe=False)


@csrf_exempt
def ocr_pdf_view(request):
    if request.method != "POST":
        return HttpResponse("Only POST allowed", status=405, content_type="text/plain")

    pdf_file = request.FILES.get("pdf")
    if not pdf_file:
        return HttpResponse("No PDF uploaded. Use field 'pdf' with a PDF file.", status=400, content_type="text/plain")

    lang = request.POST.get("lang") or request.GET.get("lang") or "pol"
    dpi_val = request.POST.get("dpi") or request.GET.get("dpi")
    try:
        dpi = int(dpi_val) if dpi_val else 300
    except ValueError:
        return HttpResponse("Invalid dpi value", status=400, content_type="text/plain")

    try:
        result = ocr_pdf(pdf_file, lang=lang, dpi=dpi)
    except TesseractNotFoundError:
        msg = (
            "Tesseract OCR binary not found.\n"
            "Install Tesseract and ensure it's on PATH, or set env var TESSERACT_CMD to the binary path.\n"
            "Examples: Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-pol; "
            "macOS: brew install tesseract; Windows: install from https://github.com/UB-Mannheim/tesseract/wiki"
        )
        return HttpResponse(msg, status=500, content_type="text/plain")
    except ValueError as e:
        # Likely missing language data
        return HttpResponse(str(e), status=500, content_type="text/plain")
    except Exception as e:
        return HttpResponse(f"OCR failed: {e}", status=500, content_type="text/plain")

    return JsonResponse({"lang": lang, **result}, safe=False)


@csrf_exempt
def upload_pdf_view(request):
    pdf_file = request.FILES.get("pdf")
    if not pdf_file:
        return HttpResponse("No PDF uploaded. Use field 'pdf' with a PDF file.",
                            status=400, content_type="text/plain")
    try:
        text = ocr_pdf(pdf_file)
        desc = ChatGPTClient().find_desc_from_pdf(text)
        return HttpResponse(desc, content_type="text/plain")
    except TesseractNotFoundError:
        msg = (
            "Tesseract OCR binary not found.\n"
            "Install Tesseract and ensure it's on PATH, or set env var TESSERACT_CMD to the binary path.\n"
            "Examples: Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-pol; "
            "macOS: brew install tesseract; Windows: install from https://github.com/UB-Mannheim/tesseract/wiki"
        )
        return HttpResponse(msg, status=500, content_type="text/plain")
    except ValueError as e:
        return HttpResponse(str(e), status=500, content_type="text/plain")
    except Exception as e:
        return HttpResponse(f"OCR failed: {e}", status=500, content_type="text/plain")
