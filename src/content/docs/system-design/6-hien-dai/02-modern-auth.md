---
title: "Xác thực và phân quyền: session, JWT, OAuth, SSO"
description: "Authentication xác minh bạn là ai, authorization quyết định bạn được làm gì; AuthN luôn đi trước AuthZ."
lesson:
  group: "Chủ đề hiện đại"
  minutes: 9
quiz:
  - q: "Hệ thống dùng JWT có thời hạn 7 ngày. Một nhân viên bị sa thải, cần chặn truy cập ngay. Vấn đề và hướng xử lý hợp lý là gì?"
    options: ["Không có vấn đề, xoá user trong DB là token tự mất hiệu lực", "Đổi thuật toán ký sang HS256", "Token vẫn hợp lệ tới khi hết hạn; nên dùng access token ngắn hạn kèm refresh token thu hồi được, hoặc denylist theo jti", "Chuyển token vào localStorage"]
    answer: 2
    why: "JWT được kiểm tra cục bộ bằng chữ ký nên không biết user đã bị xoá. Token ngắn hạn giới hạn thời gian rủi ro, refresh token và denylist cho phép thu hồi."
  - q: "PKCE bảo vệ chống lại điều gì trong luồng Authorization Code?"
    options: ["Kẻ tấn công chặn được authorization code và đem đổi lấy access token", "Người dùng quên mật khẩu", "Token bị đọc payload vì base64url không mã hoá", "Authorization server bị DDoS"]
    answer: 0
    why: "Muốn đổi code lấy token phải có code_verifier gốc, thứ chỉ client tạo ra mới biết, nên code bị đánh cắp là vô dụng."
  - q: "Một service batch chạy đêm cần gọi API nội bộ, không có người dùng nào tham gia. Luồng OAuth nào phù hợp?"
    options: ["Authorization Code + PKCE", "Implicit", "OpenID Connect với ID token", "Client Credentials"]
    answer: 3
    why: "Client Credentials dành cho máy gọi máy: service tự xác thực bằng thông tin của chính nó, không cần màn hình đăng nhập hay đồng ý."
cards:
  - q: "`401` và `403` khác nhau thế nào?"
    a: "401 nghĩa là chưa xác thực được (thiếu hoặc sai thông tin đăng nhập). 403 nghĩa là đã biết bạn là ai nhưng bạn không có quyền với tài nguyên đó."
  - q: "Ba cờ cookie quan trọng cho session id là gì?"
    a: "`HttpOnly` để JavaScript không đọc được, `Secure` để chỉ gửi qua HTTPS, `SameSite` để hạn chế gửi kèm request từ trang khác (giảm CSRF)."
  - q: "JWT gồm những phần nào?"
    a: "Ba phần base64url nối bằng dấu chấm: header (thuật toán, loại), payload (các claim như sub, exp, iss, aud) và signature."
  - q: "Payload JWT có bí mật không?"
    a: "Không. base64url chỉ là mã hoá định dạng, ai có token cũng đọc được. Chữ ký chỉ chống sửa đổi, nên không đặt dữ liệu nhạy cảm vào payload."
  - q: "Vì sao hệ thống nhiều service nên ký JWT bằng thuật toán bất đối xứng (RS256/ES256)?"
    a: "Chỉ auth server giữ private key để ký; các service chỉ cần public key để kiểm tra, nên một service bị lộ không thể giả token."
  - q: "Bốn vai trò trong OAuth 2.0 là gì?"
    a: "Resource owner (người dùng), client (ứng dụng xin quyền), authorization server (cấp token) và resource server (API giữ dữ liệu)."
  - q: "ID token và access token khác nhau ra sao trong OIDC?"
    a: "ID token (JWT) cho client biết ai vừa đăng nhập. Access token dùng để gọi API ở resource server. Không nên dùng ID token để gọi API."
  - q: "SSO hoạt động dựa trên điều gì?"
    a: "Các ứng dụng cùng tin một identity provider. Người dùng đã có session ở IdP nên khi vào ứng dụng khác được xác thực lại ngay mà không nhập mật khẩu."
  - q: "Refresh token rotation là gì?"
    a: "Mỗi lần dùng refresh token, server cấp token mới và vô hiệu token cũ; nếu token cũ bị dùng lại, coi là bị đánh cắp và thu hồi cả chuỗi."
---

:::tip[Ý chính]
- Authentication xác minh bạn là ai, authorization quyết định bạn được làm gì; AuthN luôn đi trước AuthZ.
- Session lưu trạng thái ở server nên thu hồi tức thì, còn JWT tự chứa thông tin nên scale dễ nhưng khó thu hồi trước khi hết hạn.
- OAuth 2.0 là giao thức uỷ quyền truy cập, OpenID Connect thêm lớp xác thực với ID token, và SSO dựa trên một identity provider chung.
:::

Hầu như hệ thống nào cũng phải trả lời hai câu hỏi cho mỗi request: "người gọi là ai?" và "họ có được làm việc này không?". Cách trả lời ảnh hưởng trực tiếp tới thiết kế: lưu trạng thái đăng nhập ở đâu, scale server thế nào, đăng xuất có hiệu lực ngay không, và cho phép ứng dụng bên thứ ba truy cập dữ liệu người dùng ra sao mà không cần biết mật khẩu.

Bài này đi qua các khối cơ bản: session và cookie, token và JWT, OAuth 2.0, OpenID Connect và SSO. Các nguyên tắc bảo mật chung (HTTPS, mã hoá, XSS, CSRF) có trong bài [Bảo mật](../../2-khoi-xay-dung/08-security/).

## Authentication và authorization

- **Authentication (xác thực, viết tắt AuthN)**: xác minh danh tính. Đăng nhập bằng mật khẩu, mã OTP, passkey là AuthN.
- **Authorization (phân quyền, AuthZ)**: quyết định danh tính đó được làm gì. "User 42 có được xoá đơn hàng 7 không?" là AuthZ.

AuthN luôn đi trước AuthZ. Mã lỗi cũng khác: `401` là chưa xác thực được, `403` là đã biết bạn là ai nhưng không có quyền. Mô hình phân quyền hay gặp là RBAC (theo vai trò: admin, editor) và ABAC (theo thuộc tính: chủ sở hữu tài nguyên, phòng ban).

## Session + cookie: cách stateful

1. User đăng nhập, server kiểm tra mật khẩu.
2. Server tạo một **session** (bản ghi chứa user id, thời hạn…) lưu ở server, và trả về một **session id** ngẫu nhiên trong cookie.
3. Mỗi request sau, trình duyệt tự gửi cookie; server tra session id để biết người dùng là ai.

Cookie chứa session id nên đặt các cờ `HttpOnly` (JavaScript không đọc được, giảm hậu quả XSS), `Secure` (chỉ gửi qua HTTPS) và `SameSite` (hạn chế gửi kèm request từ trang khác, giảm CSRF).

Khi có nhiều server, session không thể chỉ nằm trong RAM của một máy. Giải pháp thường là lưu session vào một kho dùng chung như Redis (xem bài [Cache](../../2-khoi-xay-dung/06-cache/)), hoặc dùng sticky session ở [load balancer](../../2-khoi-xay-dung/01-load-balancer/) (đơn giản nhưng mất session khi máy đó chết).

Ưu điểm: thu hồi tức thì (xoá session là đăng xuất), cookie nhỏ, server kiểm soát hoàn toàn. Nhược điểm: mỗi request tốn một lần tra kho session, kho session thành phụ thuộc quan trọng, và cookie không tiện cho client không phải trình duyệt hoặc gọi API khác domain.



<figure class="ccf-figure"><a href="../../guides/session-cookie-jwt-token-sso-and-oauth-2/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0152-cookies-session-jwt.png" alt="Session, Cookie, JWT, Token, SSO, and OAuth 2.0 Explained" loading="lazy" /><figcaption><strong>Session, Cookie, JWT, Token, SSO, and OAuth 2.0 Explained</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Token và JWT: cách stateless

Thay vì giữ trạng thái ở server, server cấp cho client một **token**, client gửi kèm mỗi request, thường trong header `Authorization: Bearer <token>`. Token có hai loại: **opaque** (chuỗi ngẫu nhiên, server vẫn phải tra để biết ý nghĩa, về bản chất giống session id) và **self-contained** (tự chứa thông tin, kiểm tra được mà không cần tra DB). JWT là dạng self-contained phổ biến nhất.

### Cấu trúc JWT

JWT (JSON Web Token, RFC 7519) gồm ba phần mã hoá base64url, nối bằng dấu chấm: `header.payload.signature`.

- **Header**: loại token và thuật toán ký, ví dụ `{"alg":"RS256","typ":"JWT"}`.
- **Payload**: các **claim**, ví dụ `sub` (chủ thể, thường là user id), `exp` (thời điểm hết hạn), `iss` (bên phát hành), `aud` (bên được phép nhận), cùng claim tuỳ chỉnh như role hay scope.
- **Signature**: chữ ký trên header và payload.

Điều quan trọng: base64url **không phải mã hoá bảo mật**, ai có token cũng đọc được payload. Chữ ký chỉ đảm bảo nội dung không bị sửa. Vì vậy không đặt dữ liệu nhạy cảm vào JWT.

### Ký token

- **HMAC (ví dụ HS256)**: một secret dùng chung cho cả ký và kiểm tra. Đơn giản, nhưng mọi service kiểm tra token đều giữ secret, và bất kỳ service nào cũng có thể giả token.
- **Chữ ký bất đối xứng (ví dụ RS256, ES256)**: auth server ký bằng private key; các service khác kiểm tra bằng public key (thường công bố qua một endpoint JWKS). Phù hợp hơn với hệ thống nhiều service.

Bên kiểm tra phải tự cố định thuật toán chấp nhận, kiểm tra `exp`, `iss`, `aud`, và không tin vào trường `alg` do token tự khai (từng có lỗ hổng với `alg: none`).



<figure class="ccf-figure"><a href="../../guides/jwt-101-key-to-stateless-authentication/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0244-jwt-101-key-to-stateless-authentication.png" alt="JWT 101: Key to Stateless Authentication" loading="lazy" /><figcaption><strong>JWT 101: Key to Stateless Authentication</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



### Ưu nhược và bài toán thu hồi

Ưu điểm: bất kỳ service nào có public key đều kiểm tra được token mà không cần gọi DB, nên scale ngang dễ và hợp với [API gateway](../../6-hien-dai/01-modern-api/) kiểm tra token ở biên.

Nhược điểm lớn nhất: **khó thu hồi**. Token hợp lệ tới khi hết hạn; đổi mật khẩu hay đăng xuất không làm token cũ mất hiệu lực. Các cách giảm nhẹ:

- **Access token ngắn hạn** (thường vài phút tới khoảng một giờ) kèm **refresh token** dài hạn, lưu và kiểm tra ở server, có thể thu hồi được. Nhiều hệ thống còn **xoay vòng** refresh token: mỗi lần dùng cấp token mới, phát hiện token cũ bị dùng lại thì thu hồi cả chuỗi.
- **Danh sách chặn (denylist)** theo `jti` (id của token): hiệu quả nhưng lại đưa trạng thái quay về, mất một phần lợi ích stateless.

Ngoài ra JWT to hơn session id nhiều, và đi kèm mỗi request.

## OAuth 2.0: uỷ quyền truy cập

OAuth 2.0 (RFC 6749) giải bài toán: cho một ứng dụng truy cập dữ liệu của bạn ở dịch vụ khác **mà không đưa mật khẩu** cho ứng dụng đó. Nó là giao thức **uỷ quyền**, không phải giao thức đăng nhập. Bốn vai trò:

- **Resource owner**: người dùng, chủ dữ liệu.
- **Client**: ứng dụng muốn truy cập.
- **Authorization server**: nơi người dùng đăng nhập và đồng ý, cấp token.
- **Resource server**: API giữ dữ liệu, chấp nhận access token.

Quyền được giới hạn bằng **scope** (ví dụ chỉ đọc lịch).

### Authorization Code + PKCE

Luồng dành cho ứng dụng có người dùng (web, mobile, SPA):

1. Client tạo một chuỗi ngẫu nhiên `code_verifier`, tính `code_challenge` (băm SHA-256), rồi chuyển hướng người dùng tới authorization server kèm `code_challenge`, scope và `redirect_uri`.
2. Người dùng đăng nhập và đồng ý.
3. Authorization server chuyển hướng về `redirect_uri` kèm một **authorization code** ngắn hạn.
4. Client đổi code lấy access token qua kênh back-channel, gửi kèm `code_verifier` gốc. Server băm lại và so với challenge.

PKCE (RFC 7636) đảm bảo kẻ chặn được code cũng không đổi được token vì không có `code_verifier`. Ban đầu PKCE dành cho app không giữ được secret (mobile, SPA), nhưng khuyến nghị bảo mật hiện nay (RFC 9700) là dùng cho mọi client. Luồng Implicit cũ (trả token thẳng trên URL) không còn được khuyến nghị.

### Client Credentials

Dành cho **máy gọi máy**, không có người dùng: một service batch gọi API nội bộ. Client gửi client id và secret (hoặc dùng chứng chỉ) tới authorization server và nhận access token. Không có refresh token hay màn hình đồng ý.

## OpenID Connect và SSO

OAuth chỉ nói "client này được phép làm gì", không chuẩn hoá "người dùng là ai". **OpenID Connect (OIDC)** là lớp xác thực xây trên OAuth 2.0: client xin thêm scope `openid`, và ngoài access token nhận một **ID token** (luôn là JWT) chứa thông tin danh tính như `sub`, `iss`, `aud`. Quy tắc dễ nhớ: ID token để **client biết ai vừa đăng nhập**, access token để **gọi API**.

**SSO (Single Sign-On)** cho phép đăng nhập một lần và dùng nhiều ứng dụng. Các ứng dụng tin cậy một **identity provider (IdP)** chung; khi vào ứng dụng mới, người dùng được chuyển tới IdP, vì IdP đã có session của họ nên trả ngay kết quả xác thực mà không bắt nhập lại mật khẩu. Giao thức phổ biến là OIDC và SAML (SAML dùng XML, phổ biến trong doanh nghiệp).



<figure class="ccf-figure"><a href="../../guides/v1what-is-sso-single-sign-on/" data-drawer><img src="https://assets.bytebytego.com/diagrams/0342-how-does-sso-work.jpeg" alt="What is SSO (Single Sign-On)?" loading="lazy" /><figcaption><strong>What is SSO (Single Sign-On)?</strong> · Hình: ByteByteGo. Bấm để xem giải thích.</figcaption></a></figure>



## Stateful vs stateless: đánh đổi

| | Session (stateful) | JWT (stateless) |
|---|---|---|
| Trạng thái lưu ở | Server (kho session) | Trong token, phía client |
| Kiểm tra mỗi request | Tra kho session | Kiểm tra chữ ký cục bộ |
| Thu hồi | Tức thì | Khó, chờ hết hạn hoặc cần denylist |
| Scale | Cần kho dùng chung | Dễ, không phụ thuộc kho |
| Hợp với | Web app cùng domain | API, mobile, nhiều service |

Thực tế nhiều hệ thống lai: trình duyệt giữ session cookie với một BFF hoặc gateway, còn bên trong dùng JWT ngắn hạn giữa các service. Không nên chọn JWT chỉ vì "stateless nghe hiện đại" khi một web app đơn giản dùng session là đủ và an toàn hơn về thu hồi.

## Trong phỏng vấn

- Khi thiết kế, nói rõ AuthN đặt ở đâu (thường ở [API gateway](../../6-hien-dai/01-modern-api/) hoặc auth service riêng) và AuthZ đặt ở đâu (thường trong service sở hữu dữ liệu, vì nó biết ai là chủ tài nguyên).
- Câu hỏi hay gặp: "Session và JWT khác nhau thế nào, chọn cái nào?", "Làm sao đăng xuất người dùng khi dùng JWT?", "OAuth và OIDC khác nhau ra sao?", "Vì sao cần PKCE?", "Service nội bộ xác thực với nhau thế nào?" (Client Credentials, hoặc mTLS).

## Đọc thêm

- [RFC 6749 - The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [RFC 7519 - JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
