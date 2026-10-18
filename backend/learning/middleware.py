from django.conf import settings
from django.http import JsonResponse
from django.core.exceptions import RequestDataTooBig


class RequestBoundary:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = request.headers.get("Origin")
            if (origin and origin not in settings.SAFE_ORIGINS) or request.headers.get("Sec-Fetch-Site") == "cross-site":
                return JsonResponse({"error": {"code": "origin_rejected", "message": "Cross-origin writes are disabled in local demo mode."}}, status=403)
            if request.content_type != "application/json":
                return JsonResponse({"error": {"code": "content_type", "message": "Use application/json."}}, status=415)
            try:
                if len(request.body) > settings.DATA_UPLOAD_MAX_MEMORY_SIZE:
                    raise RequestDataTooBig()
            except RequestDataTooBig:
                return JsonResponse({"error": {"code": "payload_too_large", "message": "Request exceeds 128 KiB."}}, status=413)
        return self.get_response(request)
