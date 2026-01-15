"""임베딩 벡터로 유사도 인덱스를 검색하는 예시 모듈."""

from __future__ import annotations

from typing import Any


def search_index(vector: list[float], top_k: int) -> list[dict[str, Any]]:
    """임베딩 벡터를 기반으로 유사도 검색 결과를 반환합니다.

    Args:
        vector: 이미지 임베딩 벡터
        top_k: 검색할 유사 이미지 수

    Returns:
        유사도 검색 결과 리스트(예시 데이터)
    """
    # 실제 환경에서는 벡터 DB나 ANN 인덱스를 조회합니다.
    return [
        {
            "id": f"demo-{index}",
            "score": 0.9 - index * 0.05,
            "metadata": {
                "lot_id": "LOT-DEMO",
                "defect": "scratch",
                "recipe": "R-EX",
                "tool": "EQ-01",
            },
            "imageUrl": f"https://example.com/demo-{index}.jpg",
        }
        for index in range(1, top_k + 1)
    ]
