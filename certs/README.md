# HTTPS certificates for local/LAN deployment

Đặt chứng chỉ vào thư mục này với đúng tên:

- `server.crt`
- `server.key`

## Khuyến nghị (camera trên điện thoại): dùng mkcert

> Mục tiêu: chứng chỉ phải được thiết bị **tin cậy** thì camera mới hoạt động ổn định trên mobile browser.

### 1) Cài mkcert trên máy dev

- Windows (Chocolatey): `choco install mkcert`
- Hoặc tải binary từ repo mkcert chính thức.

### 2) Cài local CA

- Chạy: `mkcert -install`

### 3) Tạo cert cho IP LAN + localhost

Chạy trong thư mục `certs`:

`mkcert -cert-file server.crt -key-file server.key 192.168.1.151 localhost 127.0.0.1`

> Nếu IP máy đổi, tạo lại cert với IP mới.

### 4) Tin cậy cert trên điện thoại

- iPhone/iPad: cài Root CA của mkcert vào máy, sau đó bật trust trong **Settings > General > About > Certificate Trust Settings**.
- Android: import CA certificate vào phần chứng chỉ người dùng (tuỳ hãng máy).

## Fallback (chỉ test nhanh): self-signed

Bạn có thể tạo self-signed bằng OpenSSL, nhưng nhiều trình duyệt mobile vẫn không coi là secure context đầy đủ cho camera.
