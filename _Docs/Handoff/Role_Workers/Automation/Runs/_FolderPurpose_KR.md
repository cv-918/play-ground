# 폴더 용도: Role Worker Automation Runs

이 폴더는 미래의 낮은 위험 역할 직원 자동화가 실행될 때 생성하는 timestamp run report를 보관한다.

각 run report에는 다음을 기록한다.

- 생성 시각
- 자동화 이름
- 확인한 역할
- 검토한 Packet
- 건너뛴 후보
- 막힌 후보
- 읽은 파일
- 작성한 파일
- 금지 행동을 수행하지 않았다는 확인

Run report는 Packet Done 처리, approval evidence 기록, validation passed 판정을 해서는 안 된다.
