"""백엔드 서비스 로직 예시.

라우터에서 호출되는 비즈니스 로직을 이곳에서 담당합니다.
"""

from __future__ import annotations

from typing import Any

from .function import build_search_payload
from ..inference.embedding import embed_image
from ..inference.index import search_index
from ..inference.llm_summary import summarize_with_llm


def search_similar_images(image_bytes: bytes, top_k: int = 5) -> dict[str, Any]:
    """유사 이미지 검색을 수행하는 서비스 함수.

    Args:
        image_bytes: 업로드된 이미지 바이너리 데이터
        top_k: 검색할 유사 이미지 수

    Returns:
        프론트에서 기대하는 형태의 결과 딕셔너리
    """
    # 1) 입력을 inference 모듈이 이해할 형태로 정리
    payload = build_search_payload(image_bytes=image_bytes, top_k=top_k)

    # 2) 임베딩 생성 및 유사도 검색
    vector = embed_image(payload["image_bytes"])
    matches = search_index(vector, payload["top_k"])

    # 3) LLM 요약 생성 (예시)
    summary = summarize_with_llm(matches)

    # 4) 응답 형태로 가공 (예시 구조)
    return {
        "topK": top_k,
        "matches": matches,
        "slides": [
            {
                "id": "summary-1",
                "title": "요약 결과",
                "subtitle": summary,
                "imageUrl": "",
                "meta": {"slide_index": 1},
            }
        ],
    }
