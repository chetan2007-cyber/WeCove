# 8. Dynamic Store Availability & Offline Logic Report

**Feature**: Authoritative Real-Time Shop Availability Engine  
**Enforcement**: Backend (`order.controller.js` & `vendor.model.js`)  
**Status**: VERIFIED & TESTED (PASS)  

---

## 1. Effective Availability Rules Matrix

```
                     +---------------------------------------+
                     | Is Vendor Approved & Account Active?  |
                     +---------------------------------------+
                                        | Yes
                                        v
                     +---------------------------------------+
                     | Is Manually Closed or Paused?         | ---> Yes: Mark CLOSED / PAUSED
                     +---------------------------------------+
                                        | No
                                        v
                     +---------------------------------------+
                     | Within Configured Business Hours?     | ---> No: Mark CLOSED (Outside Hours)
                     +---------------------------------------+
                                        | Yes
                                        v
                     +---------------------------------------+
                     | Print Agent Heartbeat <= 90s ago?     | ---> No: Mark OFFLINE (Agent Down)
                     +---------------------------------------+
                                        | Yes
                                        v
                                 [ SHOP IS OPEN ]
```

---

## 2. Order Rejection Verification
When a student attempts to submit an order (`POST /api/orders`) while a shop is offline or closed:
- **HTTP Response**: `400 Bad Request`
- **JSON Payload**: `{"success": false, "status": "OFFLINE", "message": "Shop print agent is currently offline. Orders cannot be automatically dispatched"}`
- Prevents abandoned student orders and unfulfilled payments.
