"""서비스 계층에서 공통으로 쓰는 유틸 함수 모음."""

from __future__ import annotations

from typing import Any


def build_search_payload(image_bytes: bytes, top_k: int) -> dict[str, Any]:
    """이미지 검색 요청을 위한 페이로드를 구성합니다.

    Args:
        image_bytes: 업로드된 이미지 바이너리 데이터
        top_k: 유사도 검색 개수

    Returns:
        inference 모듈에서 사용할 입력 딕셔너리
    """
    # 실제 서비스에서는 이미지 전처리나 메타데이터 구성이 추가될 수 있습니다.
    return {
        "image_bytes": image_bytes,
        "top_k": top_k,
    }
