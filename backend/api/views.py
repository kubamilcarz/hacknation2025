from pathlib import Path
from io import BytesIO
import json

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.models import Document
from api.serializers import DocumentSerializer
from tools.accident_card_pdf import render_accident_card_pdf
from tools.chatgpt import ChatGPTClient
from tools.pdf_mapper import map_pdf_fields_to_document_data, map_document_to_pdf_fields
from tools.pdf_reader import PDFReader
from tools.pdf_writer import PDFWriter
from tools.ocr import ocr_img, ocr_pdf
from tools.pdf_anonymizer import PDFAnonymizer
from pytesseract import TesseractNotFoundError


chat_client = ChatGPTClient()
pdf_anonymizer = PDFAnonymizer()

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

    if action == "list":
        return handle_document_list(request_data)

    if action == "detail":
        return handle_document_detail(request_data)

    if action == "create":
        serializer = DocumentSerializer(data=request_data)
        if not serializer.is_valid():
            return HttpResponse(
                "Invalid document data", status=400, content_type="text/plain"
            )

        document = serializer.save()
        return JsonResponse(DocumentSerializer(document).data, safe=False)

    if action in {"generate-pdf", "generate-pdf-anonymized"}:
        serializer = DocumentSerializer(data=request_data)
        if not serializer.is_valid():
            return HttpResponse(
                "Invalid document data", status=400, content_type="text/plain"
            )

        document = serializer.save()
        anonymized = action == "generate-pdf-anonymized"
        pdf_io = _render_document_pdf(document, anonymized=anonymized)

        response = HttpResponse(pdf_io.getvalue(), content_type="application/pdf")
        filename = "filled-anon.pdf" if anonymized else "filled.pdf"
        response["Content-Disposition"] = f"attachment; filename={filename}"
        return response
    return HttpResponse("Invalid action", status=400, content_type="text/plain")


def handle_document_list(request_data):
    queryset = Document.objects.all().prefetch_related("witnesses")

    search_term = request_data.get("search") or request_data.get("q")
    if search_term:
        trimmed = str(search_term).strip()
        if trimmed:
            queryset = queryset.filter(
                Q(imie__icontains=trimmed)
                | Q(nazwisko__icontains=trimmed)
                | Q(pesel__icontains=trimmed)
                | Q(miejsce_wypadku__icontains=trimmed)
            )

    help_param = request_data.get("helpProvided") or request_data.get("help_provided")
    if help_param is not None and str(help_param).strip() != "":
        queryset = queryset.filter(czy_udzielona_pomoc=_parse_bool(help_param))

    machine_param = request_data.get("machineInvolved") or request_data.get("machine_involved")
    if machine_param is not None and str(machine_param).strip() != "":
        queryset = queryset.filter(czy_wypadek_podczas_uzywania_maszyny=_parse_bool(machine_param))

    sort_param = request_data.get("sort") or request_data.get("orderBy")
    direction_param = request_data.get("direction") or request_data.get("order")
    order_by_fields = _resolve_ordering(sort_param, direction_param)
    if order_by_fields:
        queryset = queryset.order_by(*order_by_fields)
    else:
        queryset = queryset.order_by("-id")

    page_number = _parse_positive_int(request_data.get("page") or request_data.get("pageNumber"), default=1)
    page_size = _parse_positive_int(
        request_data.get("page_size")
        or request_data.get("pageSize")
        or request_data.get("limit"),
        default=10,
        minimum=1,
        maximum=100,
    )

    paginator = Paginator(queryset, page_size)
    try:
        page = paginator.page(page_number)
    except PageNotAnInteger:
        page = paginator.page(1)
    except EmptyPage:
        page = paginator.page(paginator.num_pages or 1)

    serializer = DocumentSerializer(page.object_list, many=True)
    payload = {
        "items": serializer.data,
        "totalCount": paginator.count,
        "totalPages": paginator.num_pages or 1,
        "page": page.number,
        "pageSize": page.paginator.per_page,
    }

    return JsonResponse(payload)


def handle_document_detail(request_data):
    document_id = _parse_positive_int(request_data.get("id") or request_data.get("documentId"))
    if document_id is None:
        return HttpResponse("Invalid document id", status=400, content_type="text/plain")

    document = (
        Document.objects.filter(pk=document_id)
        .prefetch_related("witnesses")
        .first()
    )
    if not document:
        return HttpResponse("Document not found", status=404, content_type="text/plain")

    serializer = DocumentSerializer(document)
    return JsonResponse(serializer.data, safe=False)


def _parse_positive_int(value, default=None, minimum=1, maximum=None):
    if value in (None, ""):
        return default

    try:
        parsed = int(str(value))
    except (TypeError, ValueError):
        return default

    if minimum is not None and parsed < minimum:
        return minimum
    if maximum is not None and parsed > maximum:
        return maximum
    return parsed


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "tak"}:
        return True
    if normalized in {"0", "false", "no", "n", "nie"}:
        return False
    return False


@api_view(["GET"])
def document_anonymized_view(request, pk: int):
    try:
        document = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        return HttpResponse("Document not found", status=404, content_type="text/plain")

    pdf_io = _render_document_pdf(document, anonymized=True)
    response = HttpResponse(pdf_io.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename=zgloszenie-{pk}-anon.pdf"
    return response


def _render_document_pdf(document: Document, *, anonymized: bool = False) -> BytesIO:
    template_path = Path("tools/ewyp.pdf")
    writer = PDFWriter()
    pdf_io = writer.fill_template(template_path, map_document_to_pdf_fields(document))
    if anonymized:
        return pdf_anonymizer.redact(pdf_io)
    return pdf_io


def _resolve_ordering(sort_param, direction_param):
    allowed = {
        "id": "id",
        "imie": "imie",
        "nazwisko": "nazwisko",
        "pesel": "pesel",
        "data_wypadku": "data_wypadku",
        "miejsce_wypadku": "miejsce_wypadku",
    }

    if sort_param not in allowed:
        return None

    field_name = allowed[sort_param]
    direction = str(direction_param or "").lower()
    if direction not in {"asc", "desc"}:
        direction = "asc" if field_name != "id" else "desc"

    if direction == "desc":
        return [f"-{field_name}"]
    return [field_name]


def read_document_from_pdf_view(request):
    pdf = request.FILES["pdf"]
    reader = PDFReader()
    document = map_pdf_fields_to_document_data(reader.read_input_fields(pdf))
    serializer = DocumentSerializer(document)
    return JsonResponse(serializer.data, safe=False)


@csrf_exempt
def accident_card_pdf_view(request):
    if request.method != "POST":
        return HttpResponse("Only POST allowed", status=405, content_type="text/plain")

    payload = {}
    content_type = request.content_type or ""
    if content_type.startswith("application/json"):
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return HttpResponse("Invalid JSON data", status=400, content_type="text/plain")
    else:
        payload = request.POST.dict()

    if not isinstance(payload, dict):
        return HttpResponse("Invalid request payload", status=400, content_type="text/plain")

    def _coerce_to_dict(value):
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return None
            return parsed if isinstance(parsed, dict) else None
        return None

    candidate_keys = ("card", "cardData", "data", "payload", "fields")
    card_data = None
    for key in candidate_keys:
        possible = _coerce_to_dict(payload.get(key))
        if possible is not None:
            card_data = possible
            break

    if card_data is None:
        card_data = payload

    if not isinstance(card_data, dict):
        return HttpResponse("Invalid card data payload", status=400, content_type="text/plain")

    try:
        pdf_io = render_accident_card_pdf(card_data)
    except ValueError as exc:
        return HttpResponse(str(exc), status=500, content_type="text/plain")

    filename = payload.get("filename") or "karta-wypadku.pdf"
    response = HttpResponse(pdf_io.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename={filename}"
    return response

#
# @csrf_exempt
# def ocr_images_view(request):
#     if request.method != "POST":
#         return HttpResponse("Only POST allowed", status=405, content_type="text/plain")
#
#     # Accept multiple files under key 'images'. Also support single 'image'.
#     files = request.FILES.getlist("images")
#     if not files and "image" in request.FILES:
#         files = [request.FILES["image"]]
#
#     if not files:
#         return HttpResponse("No images uploaded. Use field 'images' (multiple) or 'image' (single).", status=400, content_type="text/plain")
#
#     lang = request.POST.get("lang") or request.GET.get("lang") or "pol"
#
#     try:
#         results = ocr_img(files, lang=lang)
#     except TesseractNotFoundError:
#         msg = (
#             "Tesseract OCR binary not found.\n"
#             "Install Tesseract and ensure it's on PATH, or set env var TESSERACT_CMD to the binary path.\n"
#             "Examples: Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-pol; "
#             "macOS: brew install tesseract; Windows: install from https://github.com/UB-Mannheim/tesseract/wiki"
#         )
#         return HttpResponse(msg, status=500, content_type="text/plain")
#     except ValueError as e:
#         # Likely missing language data
#         return HttpResponse(str(e), status=500, content_type="text/plain")
#     except Exception as e:
#         return HttpResponse(f"OCR failed: {e}", status=500, content_type="text/plain")

    return JsonResponse({"lang": lang, "results": results}, safe=False)


# @csrf_exempt
# def ocr_pdf_view(request):
#     if request.method != "POST":
#         return HttpResponse("Only POST allowed", status=405, content_type="text/plain")
#
#     pdf_file = request.FILES.get("pdf")
#     if not pdf_file:
#         return HttpResponse("No PDF uploaded. Use field 'pdf' with a PDF file.", status=400, content_type="text/plain")
#
#     lang = request.POST.get("lang") or request.GET.get("lang") or "pol"
#     dpi_val = request.POST.get("dpi") or request.GET.get("dpi")
#     try:
#         dpi = int(dpi_val) if dpi_val else 300
#     except ValueError:
#         return HttpResponse("Invalid dpi value", status=400, content_type="text/plain")
#
#     try:
#         result = ocr_pdf(pdf_file, lang=lang, dpi=dpi)
#     except TesseractNotFoundError:
#         msg = (
#             "Tesseract OCR binary not found.\n"
#             "Install Tesseract and ensure it's on PATH, or set env var TESSERACT_CMD to the binary path.\n"
#             "Examples: Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-pol; "
#             "macOS: brew install tesseract; Windows: install from https://github.com/UB-Mannheim/tesseract/wiki"
#         )
#         return HttpResponse(msg, status=500, content_type="text/plain")
#     except ValueError as e:
#         # Likely missing language data
#         return HttpResponse(str(e), status=500, content_type="text/plain")
#     except Exception as e:
#         return HttpResponse(f"OCR failed: {e}", status=500, content_type="text/plain")
#
#     return JsonResponse({"lang": lang, **result}, safe=False)


@csrf_exempt
def zus_recommendation_view(request):
    pdf_file = request.FILES.get("pdf")
    if not pdf_file:
        return HttpResponse("No PDF uploaded. Use field 'pdf' with a PDF file.",
                            status=400, content_type="text/plain")
    try:
        text = ocr_pdf(pdf_file)
        data = chat_client.find_desc_from_pdf(text)
        recommendation = chat_client.worker_recommendation(data)
        return JsonResponse(data=recommendation, safe=False)

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


@csrf_exempt
def user_recommendation_view(request):
    if request.method != "POST":
        return HttpResponse("Only POST allowed", status=405, content_type="text/plain")

    try:
        request_data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return HttpResponse("Invalid JSON data", status=400, content_type="text/plain")

    data = request_data.get("data")
    field_name = request_data.get("field_name")
    history = request_data.get("history")
    if isinstance(history, (dict, list)):
        history = json.dumps(history, ensure_ascii=False)

    if data is None or field_name is None:
        return HttpResponse("Missing required fields: 'data' and 'field_name' must be provided.", status=400, content_type="text/plain")

    return JsonResponse(chat_client.user_recommendation(data, field_name, history), safe=False)


@csrf_exempt
def suggested_response_view(request):
    if request.method != "POST":
        return HttpResponse("Only POST allowed", status=405, content_type="text/plain")

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return HttpResponse("Invalid JSON data", status=400, content_type="text/plain")

    section_label = payload.get("sectionLabel") or payload.get("section") or ""
    status_label = payload.get("statusLabel") or payload.get("status") or ""
    summary = payload.get("summary") or ""
    incident_description = payload.get("incidentDescription") or payload.get("incident_description")
    previous_recommendation = payload.get("previousRecommendation") or payload.get("previous_recommendation")
    extra_context = payload.get("context") or payload.get("extraContext")

    if isinstance(incident_description, (dict, list)):
        incident_description = json.dumps(incident_description, ensure_ascii=False)
    if isinstance(previous_recommendation, (dict, list)):
        previous_recommendation = json.dumps(previous_recommendation, ensure_ascii=False)
    if isinstance(extra_context, (dict, list)):
        extra_context = json.dumps(extra_context, ensure_ascii=False)

    message = chat_client.suggested_response(
        section_label=section_label,
        status_label=status_label,
        summary=summary,
        incident_description=incident_description,
        previous_recommendation=previous_recommendation,
        extra_context=extra_context,
    )

    return JsonResponse({"message": message.strip()}, status=200)
