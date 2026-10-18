FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock
COPY . .
RUN useradd --create-home app && chown -R app:app /app
USER app
EXPOSE 8000
CMD ["gunicorn", "failover.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "45", "--access-logfile", "-"]
