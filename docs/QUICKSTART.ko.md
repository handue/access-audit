# AccessAudit 실행 안내

프로젝트 폴더에서 Node.js 24를 사용해 실행합니다.

```sh
npm ci
npm run dev -- --port 3100
```

브라우저에서 http://127.0.0.1:3100 을 엽니다.
개발 서버의 파일 감시 오류가 발생하면 다음 방식으로 실행하세요.

```sh
npm run build
npm start -- --port 3100
```

- **Load demo → Run accessibility audit**: 5건을 확인합니다.
- **Try fixed version → Run accessibility audit**: 0건을 확인합니다.
- **Enter URL**: 공개 웹페이지의 서버 HTML을 검사합니다.
- **Export JSON**: 결과를 파일로 내보냅니다.

AI 기능을 쓰려면 `.env.example`을 `.env.local`로 복사하고 본인의 `OPENAI_API_KEY`와 `ENABLE_AI=true`를 설정한 뒤 서버를 재시작합니다. 화면에서 **Add AI explanations**를 선택하면 됩니다. 키를 채팅이나 GitHub에 올리지 마세요. 설정이 없거나 AI 호출이 실패해도 규칙 검사와 기본 수정 안내는 작동합니다.

GPT-6 Luna의 실제 AI 설명 생성까지 확인했습니다. 공개 배포 전까지 유료 AI 기능은 비공개 환경에서 사용하세요. Vercel 배포 절차와 프로젝트 설명은 README.md에 있습니다.

데모의 0건 결과는 이 다섯 가지 검사에서 발견한 문제가 없다는 뜻입니다. 전체 WCAG 준수 여부는 별도의 검증이 필요합니다.
