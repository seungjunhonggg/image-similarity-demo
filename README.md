# Image Similarity Search UI

간단한 이미지 유사도 검색 UI를 FastAPI로 제공하는 프로젝트입니다.
이미지를 업로드하면 유사도 검색 결과와 요약 브리핑, 관련 이미지 목록을 화면에서 확인할 수 있습니다.

## 실행 방법

1) 의존성 설치

```bash
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn[standard] jinja2
```

2) 서버 실행

```bash
uvicorn app.main:app --reload
```

3) 브라우저 접속

```
http://localhost:8000
```

## 참고

- 백엔드 API 연동은 `POST /api/similarity-search`, `POST /api/summarize` 엔드포인트를 구현하면 됩니다.
- 상세한 백엔드 구조 가이드는 `BACKEND_GUIDE.md`에 정리되어 있습니다.
- 예시 서비스/추론 코드는 `app/backend/service.py`, `app/backend/function.py`, `app/inference/embedding.py`, `app/inference/index.py`, `app/inference/llm_summary.py`에 추가되어 있습니다.
