# 10_Quick_Checklists 필수 확인 섹션 번역본

이 문서는 AI 오케스트레이터 워크플로우를 사용할 때 빠르게 확인하는 체크리스트다.

---

# 1. 작업 시작 체크리스트

```text
[ ] 작업 목표가 명확한가?
[ ] 현재 상황이 적혀 있는가?
[ ] 범위가 정의되었는가?
[ ] 하지 않을 것이 정의되었는가?
[ ] 기대 산출물이 정의되었는가?
[ ] 아키텍처 리스크를 고려했는가?
[ ] 런타임 / 데이터 / 생명주기 영향을 고려했는가?
[ ] 사용자 승인이 필요한지 판단했는가?
```

아키텍처, 런타임, 데이터 스키마, Scene/Actor 생명주기, 여러 파일이 관련되면 AI 오케스트레이터 워크플로우를 사용한다.

---

# 2. 아키텍처 승인 체크리스트

```text
[ ] 최종형 아키텍처가 정의되었는가?
[ ] 축소 범위 구현이 같은 구조를 유지하는가?
[ ] 판단 / 실행 / 데이터 책임이 분리되었는가?
[ ] 소유권과 생명주기가 명확한가?
[ ] 데이터 흐름이 명확한가?
[ ] 디버깅과 추적성을 고려했는가?
[ ] 하지 않을 것이 나열되었는가?
[ ] 미룬 결정이 나열되었는가?
[ ] 사용자가 방향을 승인했는가?
```

승인 없이 구현으로 넘어가지 않는다.

---

# 3. Codex 사용 체크리스트

```text
[ ] 저장소 문맥이 실제로 필요한가?
[ ] 프롬프트에 read-only analysis가 명시되었는가?
[ ] 파일 수정 금지가 명시되었는가?
[ ] 목표가 명확한가?
[ ] 승인된 범위가 포함되었는가?
[ ] 하지 않을 것이 포함되었는가?
[ ] 검사할 시스템이 나열되었는가?
[ ] 답해야 할 질문이 나열되었는가?
[ ] 기대 출력이 정의되었는가?
[ ] 제한 사항이 명확한가?
```

추천 설정:

```text
Model: GPT-5.3-Codex 또는 GPT-5.4
Intelligence: High
Mode: Read-only analysis
```

---

# 4. Copilot 사용 체크리스트

```text
[ ] 아키텍처가 승인되었는가?
[ ] 범위가 승인되었는가?
[ ] 하지 않을 것이 승인되었는가?
[ ] 생성 허용 파일이 나열되었는가?
[ ] 수정 허용 파일이 나열되었는가?
[ ] 수정 금지 파일이 나열되었는가?
[ ] 필요한 변경이 나열되었는가?
[ ] 금지 변경이 나열되었는가?
[ ] 중단 조건이 포함되었는가?
[ ] 구현 후 요약 형식이 포함되었는가?
[ ] git status를 확인했는가?
```

추천 설정:

```text
Model: GPT-5.3-Codex
Intelligence: High
Mode: Agent Mode
Permission: 승인 파일만 수정
```

파일 범위가 불명확하면 Copilot을 사용하지 않는다.

---

# 5. Full Diff 확보 체크리스트

```text
[ ] git status를 확인했는가?
[ ] git diff --stat을 확인했는가?
[ ] 신규 파일이 diff에 포함되었는가?
[ ] untracked 파일을 git add -N 또는 staged diff로 처리했는가?
[ ] 예상 밖 파일이 없는가?
[ ] git diff --check를 실행했거나 커밋 전 실행할 예정인가?
```

신규 파일 포함:

```bash
git add -N <new_file>
git diff > review.diff
```

또는:

```bash
git add <intended_files>
git diff --cached > review.diff
```

---

# 6. Diff 리뷰 체크리스트

```text
[ ] 승인된 범위를 지켰는가?
[ ] 금지 파일이 바뀌지 않았는가?
[ ] 관련 없는 리팩토링이 없는가?
[ ] 아키텍처 경계가 유지되었는가?
[ ] 데이터 로딩과 런타임 실행이 분리되었는가?
[ ] Scene / Actor 생명주기가 안전한가?
[ ] 소유권이 명확한가?
[ ] Update order 가정이 명시적인가?
[ ] invalid data 처리가 안전한가?
[ ] debug / release 동작이 적절한가?
[ ] 숨은 동작 변경이 없는가?
[ ] diff가 리뷰 가능한가?
```

---

# 7. Visual Studio 프로젝트 파일 체크리스트

`.vcxproj` 또는 `.vcxproj.filters`가 변경되면 확인한다.

```text
[ ] 승인된 새 파일만 추가되었는가?
[ ] 관련 없는 entry가 재정렬되지 않았는가?
[ ] 기존 filter 이름이 깨지지 않았는가?
[ ] 한글 filter 이름이 정상인가?
[ ] encoding/BOM 변경이 의도적이거나 무해한가?
[ ] ResourceCompile/Image/None entry가 올바른 filter를 가리키는가?
[ ] 넓은 프로젝트 파일 재작성은 없는가?
```

---

# 8. Scene 생명주기 체크리스트

`Initialize`, `OnEnter`, `OnExit`, `Ready`, `Load`, `Setup`에서 확인한다.

```text
[ ] 부분 초기화 이후 넓은 early return이 없는가?
[ ] optional feature 실패가 해당 기능 안에서 처리되는가?
[ ] 안전하다면 core scene initialization이 계속되는가?
[ ] camera / UI / registration / cleanup symmetry가 유지되는가?
[ ] 생성된 객체의 소유권이 명확한가?
[ ] cleanup 동작이 유효한가?
```

---

# 9. 검증 체크리스트

```text
[ ] git diff --check 통과
[ ] 목표 빌드 설정 통과
[ ] 런타임 스모크 테스트 통과
[ ] 기능별 테스트 통과
[ ] 영향 받은 시스템 회귀 테스트 통과
[ ] 데이터 기반 작업이면 invalid data / edge case 테스트 통과
[ ] 아직 확인하지 못한 영역이 나열됨
```

빌드 성공만으로 완료 처리하지 않는다.

---

# 10. Dev Log 체크리스트

```text
[ ] Summary가 명확한가?
[ ] Background가 왜 필요한지 설명하는가?
[ ] Scope에 포함 / 제외가 있는가?
[ ] Files changed가 정확한가?
[ ] Architecture notes가 명확한가?
[ ] Implementation notes가 간결한가?
[ ] Review summary가 정직한가?
[ ] Validation summary가 증거 기반인가?
[ ] Remaining risks가 나열되었는가?
[ ] Next tasks가 구체적인가?
[ ] AI assistance가 필요한 경우 표시되었는가?
```

검증 결과를 지어내지 않는다.

---

# 11. 커밋 체크리스트

```text
[ ] 리뷰 통과 또는 이슈 수용
[ ] 검증 통과 또는 공백 명시적 수용
[ ] 필요한 Dev Log 존재
[ ] 남은 리스크 문서화
[ ] git status 확인
[ ] git diff --stat 확인
[ ] git diff --cached --stat 확인
[ ] 테스트용 데이터 수정이 남아 있지 않음
[ ] 예상 밖 파일이 staged 되지 않음
[ ] 커밋 메시지가 범위와 일치
```

전체 작업 트리를 리뷰하지 않았다면 `git add .`는 피한다.

---

# 12. 중단 체크리스트

다음이면 멈춘다.

```text
[ ] 승인이 없음
[ ] 범위가 불명확함
[ ] 저장소 문맥이 부족함
[ ] Copilot이 금지 파일을 수정함
[ ] diff에 예상 밖 파일이 포함됨
[ ] 신규 파일이 diff에 빠짐
[ ] Scene 생명주기 안전성이 불명확함
[ ] 승인 없는 데이터 스키마 변경이 있음
[ ] 빌드 실패
[ ] 런타임 실패
[ ] 검증 증거가 없음
[ ] 사용자가 diff를 설명할 수 없음
```

---

# 요약

```text
의도적으로 시작한다.
구현 전에 승인한다.
올바른 도구를 쓴다.
full diff를 확보한다.
검증 전에 리뷰한다.
증거로 검증한다.
남은 리스크를 기록한다.
의도적으로 커밋한다.
```
