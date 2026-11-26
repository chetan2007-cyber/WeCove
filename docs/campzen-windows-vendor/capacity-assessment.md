# 28. Measured Platform Capacity Assessment

**Conclusion**: Actual verified operational limits based on real benchmarks  
**Status**: APPROVED  

---

## Operational Capacity Matrix

| Dimension | Measured Value | Recommended Production Safe Limit |
| :--- | :--- | :--- |
| **Peak API Throughput** | 1,600 req/sec | 500 req/sec |
| **Simultaneous Active Users** | 500 Concurrent VUs | 250 Concurrent Users / Node Instance |
| **Simultaneous Order Intakes**| 50 Orders in parallel | 25 Orders / Shop Counter |
| **Database Response Latency**| 139 ms | < 200 ms |
| **Xerox Physical Print Rate** | Device Dependent (30–55 ppm)| Monitored via Windows Spooler |
