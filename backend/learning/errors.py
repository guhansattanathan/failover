from rest_framework.views import exception_handler as drf_handler
from rest_framework.response import Response
from rest_framework.exceptions import APIException


class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = "A required local service is unavailable. Start Docker services and try again."
    default_code = "service_unavailable"


class Conflict(APIException):
    status_code = 409
    default_detail = "This draft changed in another tab. Reload the saved draft before saving again."
    default_code = "revision_conflict"


def exception_handler(exc, context):
    response = drf_handler(exc, context)
    if response is not None:
        return Response({"error": {"code": getattr(exc, "default_code", "request_error"), "message": response.data}}, status=response.status_code)
    import logging
    logging.getLogger(__name__).exception("API failure", exc_info=exc)
    return Response({"error": {"code": "internal_error", "message": "The request could not be completed. Check local service health."}}, status=500)
