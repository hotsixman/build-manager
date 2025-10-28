# 빌드 및 실행(배포) workflow
1. webhook에 빌드 요청 수신
2. appBuilder에 큐 추가
3. build 후에 `next` 함수에 성공 여부 전송
4. `next` 함수에서는 `autorun`이 `true`일 경우 `runner`에 큐 추가
5. `runner` 큐에서는 기존에 실행하던 프로세스를 종료하고 새 프로세스를 실행