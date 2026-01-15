"""LLM을 호출해 요약을 생성하는 예시 모듈."""

from __future__ import annotations


def summarize_with_llm(matches: list[dict]) -> str:
    """유사도 검색 결과를 요약하는 예시 함수.

    Args:
        matches: 유사도 검색 결과 리스트

    Returns:
        요약 텍스트(예시 문자열)
    """
    # 실제 환경에서는 LLM API나 사내 모델을 호출합니다.
    count = len(matches)
    return f"총 {count}건의 유사 이미지가 검색되었습니다."
