# Public Worker A' — contract hiện hành

Code 36/PR #44 đã merge và publichsp-pilot đã deploy/được pilotaccepted. [Authority](PILOT_APRIME_AUTHORITY.md) và [ledger](PILOT_APRIME_ACCEPTANCE.md) thay các pendingdeploygates lịch sử; nguồn cấu hình thực tế vẫn phải recheck trước mutation.

## Đường phục vụ

`worker.mjs` chỉ adapt PUBLIC_READ_MODEL/ASSETS vào `serve.mjs`/`policy.mjs`. Validrequest dùng đúng `PUBLIC_READ_MODEL.prepare(resolveSql).bind(code).first()` trên basebinding/primary; tối đa một SELECT, không session/bookmark/dynamic SQL/crossrequestauthcache hoặc lookupquảntrị.

| Request/result | Hành vi |
| --- | --- |
| `/<code>` | Publishedlookup+closed manifest,308 tới `/<code>/`, không R2 read |
| `/<code>/` / nestedasset | Exactmanifestpath, root=index.html; unlisted/missing/unpublished/revoked 404 |
| GET asset | ConditionalR2 get `etagMatches`; size/ETag/bodyhợp lệ mới trả stream |
| HEAD asset | R2 head, samepins/status/security, không body |
| Unsafeorigin/malformedpath/forbiddentype/method | No storage hoặc controlled 404/405; integrity/provider/configfailure 503 |
| Shell OG / `/raw/<id>` | Chưa implement; root hiện trả uploaded HTML trực tiếp |

Snapshotđóng kiểm site/version/revision/timestamp, exactlyallowedassetfields/path/prefix/uniqueextensions allowlisted/500 files/100 MiB. MIME/cache/cookies/disposition không lấy từ R2 usermetadata. HTML direct/nested: HTTP sandbox allow-scripts không allow-same-origin, frame-ancestors none, no-store/nosniff/no-referrer. Public CORS `*` không credentials; Range/If-*caller không bypass freshlookup, không 304 authorizationcache. Đã tải trong tab không thu hồi được, projectorlag vẫn có.

Không Node/VM/PG fetch, Clerk/service/projector secret, admin/previewroute, write SQL/R2 API hay raw URL/content/provider logging. Nativebindings vẫn có writecapability; ownerđãchốtread-onlyởcode/test/review/gate, **không IAM read-only**. Không hỏi lại hoặc gọi type/facade là IAM.

## Build và regression

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:public-worker
npm run build
```

Build esbuild graph gồm fixed SQL/pureassetpolicy/tldts/publicmodules; không Node/Clerk/AWS/projector. AST/staticguardsquét sourcevàartifact, negative mutationprobes và nativeadaptertests chặn API ghi/batch/session/cache/network/loggingauthority. Miniflare/workerd chạy actual bundle, realfixtureD1/R2 và lifecycle/source-off/replay/integritytests. Đây là local tests, không tự là remoteevidence.

## Deployment và configuration

Committed `cloudflare/public/wrangler.jsonc` là **local/build template** với fake/localresource IDs, remote-disabledbindings/observability; không migrationconfig hoặc ready-to-usepilotprovisioning. Actualdeploy dùng task-ownedprivate config/approvedaccount/database/bucket/origins/artifact, recheck ngay trước và readbackactiveversion/bindings/secrets. Không tokenextraction từWrangler, migrationreplay hay legacyprovision.

Receipt 25/10: latestpublicdeployment 100%oneversion, exactly PUBLIC_READ_MODEL/ASSETS/PUBLIC_ORIGIN/STUDIO_ORIGIN,0 secretbindings, R2 private/no r 2.dev/customdomain. Chọn deploymenttheocreated_on, không arrayposition. Đây là datedmetadata, không thay livechecktrướcoperation. [Securityreceipt](validation/2026-10-25-aprime-pilot-security.md).

Rollback phải giữ read modelcontract/tombstone/failclosed/pinnedassets; không khôi phục old API/preview Worker/DBprimary writer hoặc Nodepublicfallback. Production/domainchange cần scope mới; đóngpilotissuekhông cấp quyền production.
