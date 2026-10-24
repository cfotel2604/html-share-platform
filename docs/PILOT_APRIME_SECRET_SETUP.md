# Điền secrets cho Node pilot A' — Issue38

Ngày25/10/2026. File đã được tạo trên VM `lab-b` theo yêu cầu owner:

`/opt/hsp-aprime/secrets/node.env`

File root-owned0600, thư mục cha0700. Không nằm trong Git archive, image build context hoặc public volume. Không gửi nội dung file/token/password vào chat, Git, PR, logs hay response. [Authority](PILOT_APRIME_AUTHORITY.md), [rollout plan](PILOT_APRIME_NODE_ROLLOUT.md), [receipt](validation/2026-10-24-aprime-pilot-execution.md).

## Mở file

Trong PowerShell trên máy của owner:

```powershell
ssh lab-b
```

Sau khi đã vào VM:

```bash
nano /opt/hsp-aprime/secrets/node.env
```

Giữ nguyên5dòng đã điền: `APRIME_PG_USER`, `APRIME_PG_PASSWORD`, `APRIME_R2_ENDPOINT`, `D1_PROJECTOR_ACCOUNT_ID`, `D1_PROJECTOR_DATABASE_ID`. Mật khẩu PostgreSQL mới được sinh ngẫu nhiên ngay trên VM, chưa dùng để tạo database. R2endpoint/D1target được đối chiếu với CLI pilot/receipt; không lấy từ secret của Wrangler. Không dùng thông tin PostgreSQL/MinIO cũ.

## Điền7dòng trống sau dấu bằng

### Clerk —2dòng

Mở Clerk Dashboard, chọn đúng application/environment đang dùng cho HSP lab, vào trang **API keys**. Hai key phải thuộc cùng application/environment:

- Secret Key → `APRIME_CLERK_SECRET_KEY`.
- Publishable Key → `APRIME_CLERK_PUBLISHABLE_KEY`.

Nguồn: [Clerk environment variables](https://clerk.com/docs/guides/development/clerk-environment-variables#clerk-publishable-and-secret-keys). Không thay Clerk instance hoặc rotate/revoke key cũ trong bước điền này.

### R2 writer —2dòng

Trong account Cloudflare pilot hiện tại: **R2 Object Storage → Manage R2 API Tokens**. Dùng credential riêng cho Node writer, chỉ quyền **Object Read & Write**, chọn **Apply to specific buckets only → hsp-pilot-desktop**. Có thể đặt tên `hsp-aprime-r2-writer`.

- Access Key ID → `APRIME_R2_WRITER_ACCESS_KEY`.
- Secret Access Key → `APRIME_R2_WRITER_SECRET_KEY`.

### R2 reader —2dòng

Credential riêng cho private preview, chỉ quyền **Object Read only**, cũng giới hạn đúng bucket `hsp-pilot-desktop`. Có thể đặt tên `hsp-aprime-r2-reader`.

- Access Key ID → `APRIME_R2_READER_ACCESS_KEY`.
- Secret Access Key → `APRIME_R2_READER_SECRET_KEY`.

Hai cặp này là credential S3 tương ứng từng quyền. Lưu trực tiếp vào file/secret store Node khi dashboard hiển thị. Không dùng quyền quản trị account/bucket hoặc dùng chung writer cho preview. Nguồn: [Cloudflare R2 authentication](https://developers.cloudflare.com/r2/api/tokens/), [S3 setup](https://developers.cloudflare.com/r2/get-started/s3/).

### Projector D1 —1dòng

Theo policy owner đã chốt: token riêng tên **hsp-projector-pilot**, trong account pilot hiện tại. Cloudflare API Tokens → Create Custom Token → quyền **Account → D1 → Edit**; resource chỉ account đang chạy pilot. Đây là quyền đọc/ghi D1 trong UI hiện hành. Không thêm Workers, R2 hoặc quản trị account. Token chỉ ở Node secret store/startup env, không dùng chung Wrangler/dashboard.

- Giá trị API token → `D1_PROJECTOR_API_TOKEN`.

Nguồn: [hướng dẫn D1 chính thức](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/partials/d1/generate-d1-api-token.mdx). Rotation90ngày hoặc ngay theo các trigger đã chốt; [policy/runbook](PUBLIC_PROJECTOR.md). Không tạo/revoke token khác ngoài quy trình này.

## Lưu và tiếp tục

Trong nano: `Ctrl+O`, `Enter`, rồi `Ctrl+X`. Mỗi giá trị nằm trên đúng một dòng sau dấu `=`. Chỉ báo **“đã điền”** sau khi lưu; không gửi giá trị hoặc nội dung file.

Agent kiểm tra quyền file, required-field booleans và Compose config ở chế độ quiet; không in secret. Sau đó mới tiếp tục bước PG/migrate/web/preview/projector và target/scope/readback theo rollout plan. Việc tạo file hoặc điền đủ trường chưa phải bằng chứng token đúng scope, R2readback, public projection, SLO, preview/browser hay10PASS. Không tự thay upstream khi candidate chưa qua các kiểm tra cần thiết.
