# Ledger nghiệm thu A' pilot/lab

Owner nghiệm thu 38/Epic #31 sau merge #59 ngày 25/10/2026; owner merge #19 ngày 26/10 tại 3 c 965 b 5 đóng 10 cho **pilot/lab hiện tại**. [Acceptance 38](https://github.com/cfotel2604/html-share-platform/issues/38#issuecomment-6398587876), [security review](validation/2026-10-25-aprime-pilot-security.md). Không production approval.

## Bằng chứng theo scope

| Mục | Cơ sở / giới hạn |
| --- | --- |
| Node admin/500 files | Owner realUIpublish/copy/view + actual PG/R2 manifest/readback.12 transfer upload 11.862 s là Node/operator, không fresh GUIlatencytrace |
| Outbox/projector | ActualFIFOstop→publish/revoke→restart, finalrevoked; old/duplicate replay 0 changes. Credentials chỉ Node, one batch/event |
| Healthy, 20 mẫu / manifest 500 file | Revoke COMMIT→firstpublic 404 p50=4928 ms/p95=5298 ms; projection p50=4195.561 ms/p95=4691.001 ms. [Raw numeric CSV](validation/2026-10-25-revoke-healthy-samples.csv) |
| Outage/retry | 107.961 s và 314.865 s riêng.300 s cooldown/restart/503/lost ACK were transport-injected; real PG/D1 retry/readback, không provider-generated 429 |
| Recovery | Actualaudited 21 row populatedrebuild/reconcile cuối 0 diff; empty/drift/conflict local tests và independentreader 12/12 riêng |
| Publicindependence | Chỉ newweb/preview/projector/PG stopped, publicassets 200/integrity, same ID srestored; không physicalwhole VM-off |
| Preview | HTTPS/real 180 s expiry 404, invalidscope/grant/assets denial, real Adminiframe/script render, sandbox giữ nguyên |
| Browser | Five local/desktopcontexts kiểm cookies/storage/worker/popup/parent access; mobile/Employee/Safari/Zalo owner-confirmed, không inventedversion/device traces |
| Warning | Studio pending/overdue/stale, visible 15 srefreshwhilepending; không externaldelivery/closed-tab/VM outage guarantee |
| Token/R2 roles | Owner scopeconfirmation; approvednormal rotation 25/10+actualpre/postdrain; separatebucketwriter/read-onlyreader owner-confirmed. Native Workerbinding không IAM read-only |
| Logging | SSHnginx 2 accessoff/3 errorprotected, local Docker/journal/no recognizedshipper,0 previewpattern in bounded samples. Provider Logpush/DNS analytics ngoài SSH chưa xác minh, không OFF/PASS |
| Security/dependencies | Source/CI, full+production audit 0 tại ngày/headđãghi; point-in-time, không cam kết không bao giờ có vulnerability |

Healthy revoke p95≤60 s và pending>60 swarning là policy owner chốt. Khi projector/REST dừng, public có thể giữ state cũ cho đến recovery/containment; **không có 60 s outage blocking guarantee**, không trộn outage vào healthypercentile. Không thu hồi byte đã tải.

## Owner cho bỏ qua / giữ ngoài phạm vi

Extra live deliberateD1 drift, deployed WorkerR2 corrupt-pin, provider-generatedprolonged 429 và emergencyactive-tokenrevocation **omitted by owner cho pilot**, không tested PASS. Local/injected/actualordinaryrotation evidence vẫn giữ phạm vi riêng. Không ép chạy lại để sửa tài liệu.

Oldviewer 4100/testlinks do owner giữ; không fulllegacyretirementclaim. Cloudprovider logging ngoài VM chưa kiểm; owner review/merge 19 chốt boundedpilot audit với giới hạn đã ghi. Production target/domain/Clerk/TLS/capacity/abuse/logging/rollback sẽ review khi owner giao, không suy từ ledger này.

## Nơi tra chi tiết

[Execution](validation/2026-10-24-aprime-pilot-execution.md), [preview](validation/2026-10-25-public-preview.json), [faults](validation/2026-10-25-projector-faults.md), [rotation/browser](validation/2026-10-25-browser-boundary.md), [GUIrevoke](validation/2026-10-25-gui-revoke-retest.md), [closeout](validation/2026-10-25-aprime-closeout.md), [SSH logging](validation/2026-10-25-aprime-logging.json). Các nhận xét pending trong receipt là thời điểm của receipt, không override owner acceptance sau đó.

[Plan chuẩn bị ban đầu và các packet](history/README.md) giữ ở bản Git cố định; không dùng chúng làm remoteapproval/freshstart mới. Vận hành theo [authority](PILOT_APRIME_AUTHORITY.md) và [runbook](PILOT_APRIME_NODE_ROLLOUT.md).
