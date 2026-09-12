# ✨ JoyWalk (Micro-Happiness Map)

JoyWalk는 바쁜 일상 속 이동 시간을 조금 더 즐겁게 만들어주는 **'소확행(작고 확실한 행복)' 지도 및 경로 안내 웹 애플리케이션**입니다. 
단순히 가장 빠른 길을 안내하는 것이 아니라, 누군가 남겨둔 귀여운 강아지, 예쁜 벚꽃, 분위기 좋은 카페 등 **작은 기쁨이 있는 장소(Joy Spot)를 경유하는 산책 경로**를 제안합니다.

---

## 🎯 핵심 기능 (Core Features)

### 1. ✨ Joy Route 추천 (우회 경로 안내)
* 출발지(FROM)와 도착지(TO)를 입력하면, 경로 주변 Joy Spot을 하이브리드 협업 필터링으로 개인화하고 최단 Hamiltonian path로 방문 순서를 최적화합니다.
* 가장 빠른 길이 아니더라도, 걷는 내내 작은 기쁨을 마주할 수 있도록 의도적으로 우회하는 경로를 제안합니다.
* Google Maps Directions API를 활용하여 도보(Walking) 기준의 경로, 거리, 소요 시간을 제공합니다.

### 2. 📍 현재 위치에서 소확행 공유 (Share Here)
* 길을 걷다 마주친 행복한 순간을 지금 서 있는 위치에 바로 남길 수 있습니다.
* **📸 사진 찍기 & 앨범 선택**: 노트북/스마트폰 웹캠을 직접 실행하여 사진을 찍거나 갤러리에서 사진을 업로드할 수 있습니다. (전면/후면 카메라 전환 지원)
* **🤖 이모지 자동 추천**: 남긴 글(예: "여기 커피 향이 너무 좋아")의 키워드를 분석하여 어울리는 이모지(☕, 🌸, 🐕 등)를 자동으로 추천해 줍니다.
* 공유된 핀은 즉시 지도에 나타나며, 다른 사람들의 산책 경로에 추천될 수 있습니다.

### 3. 🗺️ Gen-Z 감성의 맵 UI
* Apple의 유체 인터페이스(Fluid Interface) 디자인을 모티브로 한 부드러운 애니메이션과 반응형 상호작용(스프링 효과, 글래스모피즘)을 적용했습니다.
* 어두운 배경(Dark Mode)에 네온 컬러(Purple, Pink, Lime)를 활용한 트렌디한 '도파민 팔레트' 디자인을 채택했습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **프레임워크**: [Next.js (App Router)](https://nextjs.org/) + [React](https://react.dev/)
* **스타일링**: [TailwindCSS](https://tailwindcss.com/) (Inline Styles와 혼합하여 정밀한 레이아웃 구현)
* **지도 및 경로**: [Google Maps Platform](https://developers.google.com/maps)
  * Maps JavaScript API (지도 렌더링 및 커스텀 마커)
  * Places API (장소 자동완성 검색)
  * Directions API (경유지가 포함된 도보 경로 탐색)
  * Geocoding API (좌표 <-> 주소 변환)
* **웹캠 제어**: `navigator.mediaDevices.getUserMedia` API 활용 (순수 웹 표준 기술)

---

## 📂 주요 폴더 구조

```text
joywalk/
├── app/
│   ├── page.tsx               # 메인 페이지 (지도 뷰, 모달 등 상태 관리 및 렌더링)
│   ├── globals.css            # 글로벌 스타일 및 커스텀 디자인 시스템 (Gen Z 스타일)
│   └── layout.tsx
├── components/
│   ├── MapView.tsx            # 구글 지도 렌더링, 핀 표시, 내 위치 찾기, 경로 그리기
│   ├── RoutePanel.tsx         # FROM/TO 입력창 및 Joy Route 탐색 UI
│   ├── JoyCard.tsx            # 개별 소확행 핀 상세 정보 및 경로 요약 정보 표시 뷰
│   ├── ShareAtLocationModal.tsx # 내 위치에 새로운 소확행을 남기는 모달 (웹캠 기능 포함)
│   └── ShareModal.tsx         # 기존 핀에 나의 경험을 추가하는 모달
└── lib/
    ├── routing.ts             # 바운딩 박스 계산 및 경유지 무작위 추출 알고리즘 로직
    ├── autoEmoji.ts           # 텍스트 키워드 기반 이모지 추천 로직
    └── mockPins.ts            # 초기 더미 데이터 (피츠버그 일대의 소확행 핀들)
```

---

## 🚀 향후 발전 방향 (Future Scope)

현재는 15명의 로컬 mock interaction과 3개의 demo persona로 추천 차이를 시연합니다. 다음 단계는 실제 like/visit 이벤트를 Firestore에 쌓아 mock 신호를 교체하는 것입니다.
