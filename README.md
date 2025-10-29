# 목표
- 프로그램의 자동 빌드
- 빌드된 프로그램의 버전 관리
- 빌드된 프로그램의 실행

# 메인 스크립트 (index.ts)
- 빌드를 위한 서버 생성
    - webhook
    - 관리용 API
- 빌드된 프로그램의 데이터 및 버전을 관리하는 DB 관리

# Class
## Main
- 메인 프로세스 관리

## AppBuilder
- `.build.env` 등을 이용하여 앱 빌드
- 런타임의 `build.js`를 호출

## BuildData
- 빌드에 관한 데이터

## DB

## Logger

## WebhookServer

## Runner
- 빌드된 프로그램의 실행을 담당

## ReadLine
- 입력출력 담당

## EnvManager
- env를 관리

# 설정 파일 (config.js로 관리)

# env
- `.build.env`: 빌드 시 사용할 env 파일
- `.prod.env`: 프로덕션 시 사용할 env 파일