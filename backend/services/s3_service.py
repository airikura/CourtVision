import boto3
from botocore.config import Config
from core.config import settings

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            config=Config(signature_version="s3v4"),
        )
    return _s3_client


def generate_presigned_post(session_id: str, content_type: str) -> tuple[str, dict]:
    """Generate a presigned POST URL for direct browser-to-S3 upload.
    Returns (url, fields) tuple.
    """
    s3 = get_s3_client()
    key = f"uploads/{session_id}/video"

    response = s3.generate_presigned_post(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, 10 * 1024 * 1024 * 1024],  # up to 10GB
        ],
        ExpiresIn=3600,
    )

    return response["url"], response["fields"]


def generate_presigned_get(session_id: str, expires_in: int = 900) -> str:
    """Generate a presigned GET URL to download the uploaded video (15 min default)."""
    s3 = get_s3_client()
    key = f"uploads/{session_id}/video"

    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
    return url
