# 24. Platform Load Testing Report (Virtual Users)

**Test Tool**: Automated Node.js Virtual User Engine  
**VUs Tested**: 25, 50, 100, 250, 500  
**Status**: MEASURED & VERIFIED  

---

## Measured Performance Table

| Virtual Users (VUs) | Requests Per Second (RPS) | Median Latency (p50) | 95th Percentile (p95) | 99th Percentile (p99) |
| :--- | :--- | :--- | :--- | :--- |
| **25 VUs** | 243.0 req/s | 67.1 ms | 69.7 ms | 84.7 ms |
| **50 VUs** | 675.4 req/s | 64.2 ms | 67.5 ms | 67.7 ms |
| **100 VUs** | 848.9 req/s | 96.7 ms | 104.7 ms | 105.0 ms |
| **250 VUs** | 1,031.9 req/s | 142.1 ms | 208.6 ms | 209.4 ms |
| **500 VUs** | 1,600.4 req/s | 201.9 ms | 272.9 ms | 275.4 ms |
