from __future__ import annotations

import os

import boto3


class S3Client:
    def __init__(self, region: str | None = None, bucket: str | None = None):
        self.region = region or os.getenv("AWS_REGION", "ap-northeast-2")
        self.bucket = bucket or os.getenv("AWS_S3_BUCKET")
        self.client = boto3.client("s3", region_name=self.region)

    def upload_file_bytes(self, content: bytes, key: str, content_type: str) -> dict:
        if not self.bucket:
            raise RuntimeError("AWS_S3_BUCKET environment variable is required.")
        if not isinstance(content, (bytes, bytearray, memoryview)):
            raise ValueError("content must be binary data")

        response = self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=bytes(content),
            ContentType=content_type,
        )
        return response

    def delete_files(self, keys: list[str]) -> dict:
        if not keys:
            return {"Deleted": [], "Errors": []}
        if not self.bucket:
            raise RuntimeError("AWS_S3_BUCKET environment variable is required.")
        objects = [{"Key": key} for key in keys]
        return self.client.delete_objects(
            Bucket=self.bucket,
            Delete={"Objects": objects},
        )

