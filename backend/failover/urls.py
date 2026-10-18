from django.urls import path
from learning import views as v

handler404 = "learning.http_errors.not_found"
handler500 = "learning.http_errors.server_error"

urlpatterns = [
    path("api/v1/components", v.components), path("api/v1/challenges", v.challenges),
    path("api/v1/challenges/<slug:slug>", v.detail), path("api/v1/challenges/<slug:slug>/draft", v.draft),
    path("api/v1/challenges/<slug:slug>/submissions", v.submissions), path("api/v1/submissions/<uuid:pk>", v.submission),
    path("api/v1/submissions/<uuid:pk>/retry", v.retry), path("api/v1/health/live", v.live), path("api/v1/health/ready", v.ready),
]
