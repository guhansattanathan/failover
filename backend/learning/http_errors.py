from django.http import JsonResponse


def not_found(request, exception):
    return JsonResponse({"error": {"code": "not_found", "message": "This API resource does not exist."}}, status=404)


def server_error(request):
    return JsonResponse({"error": {"code": "internal_error", "message": "The request could not be completed."}}, status=500)
