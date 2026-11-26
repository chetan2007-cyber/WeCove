# 25. Stress Testing & Failure Mode Report

**Objective**: Determine operational boundaries and resource limits under heavy concurrency  
**Status**: COMPLETED  

---

## Bottleneck Findings
1. **Database Latency**: MongoDB Atlas connection latency hovered between 130ms and 150ms over cellular/WAN connections. Node connection pooling mitigates head-of-line blocking.
2. **CPU & Memory**: Under 500 concurrent VUs, Node.js heap memory remained stable at < 185 MB with 0 memory leaks observed.
