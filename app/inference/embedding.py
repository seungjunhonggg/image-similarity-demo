"""이미지 임베딩 생성을 담당하는 예시 모듈."""

from __future__ import annotations


def embed_image(image_bytes: bytes) -> list[float]:
    """이미지 바이너리를 벡터로 변환하는 예시 함수.

    Args:
        image_bytes: 업로드된 이미지 바이너리

    Returns:
        임베딩 벡터(예시로 고정된 값)
    """
    # 실제로는 모델 로딩 후 전처리/추론 로직이 들어갑니다.
    return [0.1, 0.2, 0.3, 0.4]
