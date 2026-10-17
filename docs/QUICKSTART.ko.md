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

AI 기능은 `.env.local`에서 `ENABLE_AI=true`로 켭니다. Muse를 쓰려면 `AI_PROVIDER=auto`, `MUSE_MODEL=muse-spark-1.3`을 두고 `MODEL_API_KEY`에 Meta Model API 키를 넣으세요. 자동 선택은 Muse 키가 있으면 Muse를, 없으면 기존 OpenAI 키로 Luna를 사용합니다. 한쪽을 지정하려면 `AI_PROVIDER=muse` 또는 `AI_PROVIDER=openai`로 설정합니다. 실패한 요청을 다른 업체로 자동 재전송하지 않습니다.

설정 후 `npm run check:ai`로 실제 호출을 확인할 수 있습니다. `aiStatus: "enabled"`, `explained: 5`가 나오면 성공입니다. 서버는 다시 빌드해 실행하고 화면의 **Add AI explanations**를 선택하세요. 키를 채팅이나 GitHub에 올리지 마세요.

Muse-spark-1.3/GPT-6 Luna의 실제 AI 설명 생성까지 확인했습니다. 공개 배포 전까지 유료 AI 기능은 비공개 환경에서 사용하세요. Vercel 배포 절차와 프로젝트 설명은 README.md에 있습니다.

데모의 0건 결과는 이 다섯 가지 검사에서 발견한 문제가 없다는 뜻입니다. 전체 WCAG 준수 여부는 별도의 검증이 필요합니다.
