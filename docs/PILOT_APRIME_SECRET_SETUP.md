# Secret roles A' pilot — bảo trì sau setup

Operator đã nạp secret store khi rollout. Trang này mô tả role/policy hiện hành, **không phải yêu cầu tạo lại hoặc ghi đè file đang dùng**. [Initial handoff](history/README.md) chỉ là record. Không mở/in/copy `.env`, token, emailbootstrap, session hoặc secretvalues để đưa vào chat/PR/Git.

## Nơi lưu và phân quyền

Node secret store trên lab-b: `/opt/hsp-aprime/secrets/node.env`, root-owned 0600 trong directory 0700; Compose nạp process env theo role. Metadata pin env trong active-deployment.json chỉ giữ imagepins, không thay secret store. Diagnostics chỉ hiện diện/role booleans; không dump Compose đã expand/Docker Config.Env hay hash/fingerprint token.

| Role | Được nhận | Không được nhận |
| --- | --- | --- |
| db/migrate | PG credentials cho initializedsource | D1/Clerk/R2 writer token không cần thiết |
| web | PG + Clerk + pilot bucketwriter | D1 projector token |
| preview | PG + pilot bucketread-onlyreader | Clerk/admin/D1 writer credentials |
| projector/recovery | PG + dedicatedD1 account/database/token | Clerk hoặc R2 writer |
| public Worker | D1/R2 nativebindings, PUBLIC_ORIGIN/STUDIO_ORIGIN | Node PG/Clerk/service/projector secret |

Template names: APRIME_PG_USER/PASSWORD; APRIME_CLERK_SECRET_KEY/PUBLISHABLE_KEY; APRIME_R2_ENDPOINT; APRIME_R2_WRITER_ACCESS_KEY/SECRET_KEY; APRIME_R2_READER_ACCESS_KEY/SECRET_KEY; D1_PROJECTOR_ACCOUNT_ID/DATABASE_ID/API_TOKEN. Không ghi giá trị mẫu thật hoặc dùng chung credential để đơn giản hóa.

Owner đã xác nhận R2 writer/reader tách nhau, pilot bucket-only, readerchỉđọc. Dedicatedprojector token D1 R/W only, không Workers/R2/accountadmin, không dùng chung Wrangler/dashboard. Native Workerbindingread-only vẫn là code/test, không IAM restriction.

## Thay/rotate

Không thay token để kiểm tra docs. Theo policy:90 ngày hoặc incident; operator tạo replacement cùngscope → nạp secret store → restart riêng projector có guard/no-deps → kiểm drain → revoke old → chỉ ghi ngày/tên. Receipt 25/10 active hsp-projector-pilot-1, old tokenrevoked, nextregular 2027-01-23. Không automation/reminder được suy từ ngày này.

Emergencyrevoke trên dashboard rồi khôi phục theo runbook; outboxgiữpending/Adminwarn, public đọc state đã chiếu vì không dùng token projector. Revoking token không containment public content. Tokenclass/account/scope mới hoặc privatefiles ngoài authority cần owner; không hỏi lại policy đã chốt và không gửi giá trị token.

Adminbootstrap chỉ làm một lần bằng operator CLI có audit trên PGmới. Không import old users/allowlist hoặc chạy lại bootstrap để làm test. Policy changes tiếp theo qua Nodeoperator path theo scope, không manual SQL bypass.
