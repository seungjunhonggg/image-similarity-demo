# 이미지 유사도 데모 백엔드 가이드 (초보자용)

이 문서는 FastAPI 기반의 데모 프로젝트에서 **백엔드를 어디에, 어떤 구조로 넣으면 좋은지**를 설명합니다.
실제 현업에서도 쓰이는 계층 분리를 기반으로 작성했습니다.

## 1) 현재 프로젝트 구조 (요약)

```
image-similarity-demo/
├── app/
│   ├── main.py
│   ├── routers/
│   │   └── demo.py
│   ├── templates/
│   │   └── demo.html
│   └── static/
│       ├── css/
│       │   └── demo.css
│       └── js/
│           └── demo.js
├── demo.html  # 이전 데모 파일 (선택적으로 삭제 가능)
└── BACKEND_GUIDE.md
```

현재 화면은 `app/templates/demo.html`을 사용하며, JS는 `app/static/js/demo.js`에 있습니다.

## 2) 실무형 권장 구조 (확장형)

아래 구조는 실제 서비스에서도 흔하게 쓰는 형태입니다. 핵심은 **라우터, 서비스, 인퍼런스, 스키마 분리**입니다.

```
app/
├── main.py                 # FastAPI 앱 생성, 라우터 등록
├── core/                   # 공통 설정/로깅
│   ├── config.py           # 환경변수, 설정 로딩
│   └── logging.py
├── routers/                # HTTP 엔드포인트
│   ├── demo.py
│   ├── similarity.py       # /api/similarity-search
│   └── summarize.py        # /api/summarize
├── schemas/                # Pydantic 요청/응답 모델
│   ├── similarity.py
│   └── summarize.py
├── services/               # 비즈니스 로직
│   ├── similarity_service.py
│   └── summarize_service.py
├── inference/              # 모델/벡터 인퍼런스
│   ├── embedding.py        # 이미지 -> 임베딩
│   ├── index.py            # 유사도 인덱스 검색
│   └── llm_client.py       # 요약 모델 호출
├── repositories/           # 메타데이터/스토리지 접근
│   └── metadata_repo.py
├── templates/
└── static/

# (선택)
├── tests/
├── scripts/
└── data/
```

### 왜 이렇게 나누나요?
- `routers/`는 **HTTP 요청/응답**만 처리합니다.
- `services/`는 **업무 로직**을 담당합니다. (ex: 검색 결과 조합)
- `inference/`는 **모델 로딩/추론**만 담당합니다. (GPU/CPU 부담 분리)
- `schemas/`는 **데이터 구조를 명확히** 하여 프론트/백엔드 간 계약을 고정합니다.

## 3) 프론트와 맞는 API 계약

### 3.1 유사도 검색
- 엔드포인트: `POST /api/similarity-search`
- 요청: `multipart/form-data`
  - `image`: 이미지 파일
  - `topK`: 숫자
- 응답 예시:

```json
{
  "topK": 5,
  "matches": [
    {
      "id": "rec-001",
      "score": 0.93,
      "metadata": {
        "lot_id": "LOT-2024",
        "defect": "scratch",
        "recipe": "R-118",
        "tool": "EQ-07"
      },
      "imageUrl": "https://..."
    }
  ],
  "slides": [
    {
      "id": "slide-1",
      "title": "요약 결론",
      "subtitle": "query image 기준",
      "imageUrl": "https://...",
      "meta": {
        "slide_index": 1
      }
    }
  ]
}
```

### 3.2 요약 생성
- 엔드포인트: `POST /api/summarize`
- 요청: JSON (유사도 검색 결과 전체 또는 필요한 부분)
- 응답 예시:

```json
{ "summary": "LLM 요약 텍스트..." }
```

프론트는 `app/static/js/demo.js`에서 위 형태를 기대합니다.

## 4) 파일별로 어떤 코드를 넣으면 좋은가?

### 4.1 라우터 예시 (`app/routers/similarity.py`)

```python
from fastapi import APIRouter, UploadFile, File, Form
from ..services.similarity_service import search_similar
from ..schemas.similarity import SimilarityResponse

router = APIRouter(prefix="/api", tags=["similarity"])

@router.post("/similarity-search", response_model=SimilarityResponse)
async def similarity_search(image: UploadFile = File(...), topK: int = Form(5)):
    return await search_similar(image, topK)
```

### 4.2 서비스 예시 (`app/services/similarity_service.py`)

```python
from ..inference.embedding import embed_image
from ..inference.index import search_index
from ..repositories.metadata_repo import get_metadata
from ..schemas.similarity import SimilarityResponse, Match, Slide

async def search_similar(image_file, top_k: int) -> SimilarityResponse:
    image_bytes = await image_file.read()
    vector = embed_image(image_bytes)

    ids_scores = search_index(vector, top_k)
    matches = []
    for item_id, score in ids_scores:
        meta = get_metadata(item_id)
        matches.append(Match(id=item_id, score=score, metadata=meta, imageUrl=meta["imageUrl"]))

    slides = build_slides(matches, top_k)
    return SimilarityResponse(topK=top_k, matches=matches, slides=slides)
```

### 4.3 인퍼런스 분리 (`app/inference/embedding.py`)

```python
from functools import lru_cache

@lru_cache
def get_model():
    # 모델 로딩은 1번만
    return load_model_from_disk("/path/to/model")

def embed_image(image_bytes: bytes):
    model = get_model()
    return model.encode(image_bytes)
```

### 4.4 요약 서비스 분리 (`app/services/summarize_service.py`)

```python
from ..inference.llm_client import summarize_text

async def summarize(sim_result: dict) -> str:
    prompt = build_prompt(sim_result)
    return await summarize_text(prompt)
```

## 5) 인퍼런스 분리를 추천하는 이유

- **모델 로딩은 비싸다** → 요청마다 로딩하면 느려짐
- **GPU/CPU 부담 분리** → 추론 전용 모듈에 집중
- **테스트가 쉬움** → 서비스 로직과 모델 추론을 따로 검증 가능

실무에서는 다음 패턴을 권장합니다:
- 모델 로딩은 `startup` 시점 또는 `@lru_cache`로 1회만
- 추론이 무거우면 **별도 워커/서비스**로 분리 (예: gRPC, Celery)
- 인덱스/메타데이터는 디스크/DB에서 캐싱

## 6) 파이프라인 사고방식 (권장)

유사도 검색 + 요약은 아래 단계로 나누면 디버깅이 쉽습니다.

```
Acquire  -> 이미지 입력
Prepare  -> 임베딩 벡터 생성
Process  -> 유사도 검색
Parse    -> matches 구조화
Render   -> 요약 생성 + 슬라이드 조합
```

이렇게 나누면 실패 지점이 명확하고, 중간 결과를 캐싱하기 쉽습니다.

## 7) 테스트/운영 팁

- `tests/`에 라우터 단위 테스트 작성
- `services/`는 별도 단위 테스트로 검증
- 로그는 `core/logging.py`에서 일관되게 관리
- 환경 변수는 `core/config.py`에서 로딩

## 8) 바로 시작하는 체크리스트

1. `app/routers/similarity.py`, `app/routers/summarize.py` 추가
2. `app/services/`에 비즈니스 로직 구현
3. `app/inference/`에 모델 로딩/인덱스 검색 구현
4. `app/schemas/`로 요청/응답 계약 고정
5. `demo.js`에서 `USE_MOCK = false`로 변경

---
