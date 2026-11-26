# 20. Network Security and SSL/TLS Verification Report

**Domains Tested**: `wecove.in`, `www.wecove.in`, `api.wecove.in`  
**Protocol**: TLS 1.3 / TLS 1.2  
**Status**: PASS  

---

## Certificate & Transport Audit
- **Certificate Authority**: Google Trust Services / Cloudflare Origin CA
- **Cipher Suites**: Modern TLS 1.3 (AEAD ciphers: AES-128-GCM, CHACHA20-POLY1305)
- **HSTS**: `max-age=31536000; includeSubDomains` active on all API responses.
- **Insecure HTTP**: Automatic 301 redirection to HTTPS.
