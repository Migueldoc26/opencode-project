FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8765

WORKDIR /app

COPY app.py README.md ./
COPY static ./static
COPY data ./data

EXPOSE 8765

CMD ["python", "app.py"]
