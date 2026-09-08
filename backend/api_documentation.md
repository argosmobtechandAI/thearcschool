# The Arc School ERP — Complete Multi-Tenant SaaS API Specification

**Base URL**: `https://api.arcschool.cloud/api` (Production) / `http://localhost:5000/api` (Local Dev)  
**Version**: `v1.0.0`  
**Authentication**: Bearer JWT (`Authorization: Bearer <token>`)  
**Tenant Resolution**: Automatic via Subdomain (`greenwood.arcschool.cloud`), Custom Header (`x-school-id: <uuid>`), or JWT Token Claims (`schoolId`).

---

## 1. Global API Standards & Conventions

### 1.1 Standard Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
x-school-id: 3fa85f64-5717-4562-b3fc-2c963f66afa6   (Optional if using subdomain)
Content-Type: application/json
```

### 1.2 Standard Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRecords": 150,
    "totalPages": 8
  }
}
```

### 1.3 Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "The specified school domain is invalid or inactive.",
    "details": []
  }
}
```

### 1.4 HTTP Status Codes
* `200 OK`: Request succeeded.
* `201 Created`: Resource successfully created.
* `400 Bad Request`: Validation error or missing required fields.
* `401 Unauthorized`: Token missing, expired, or invalid.
* `403 Forbidden`: User role does not have permission, or school subscription is suspended.
* `404 Not Found`: Resource or tenant not found.
* `409 Conflict`: Unique constraint violation (e.g. Duplicate school code / admission number).
* `500 Internal Server Error`: Unhandled server exception.

---

## 2. Platform Super Admin APIs
*Base Path: `/api/super-admin` | Authentication: Required (`super_admin` role)*

### 2.1 Super Admin Authentication
* **`POST /api/super-admin/auth/login`**
  * **Request Body:**
    ```json
    {
      "email": "admin@arcschool.cloud",
      "password": "Password@123"
    }
    ```
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsIn...",
        "user": {
          "id": "sa-101",
          "name": "Platform Super Admin",
          "email": "admin@arcschool.cloud",
          "role": "super_admin"
        }
      }
    }
    ```

### 2.2 School Tenant Management
* **`GET /api/super-admin/schools`**
  * **Query Params:** `page=1`, `limit=20`, `search=greenwood`, `status=active`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "sch-001",
          "name": "Greenwood High International",
          "code": "GREENWOOD",
          "subdomain": "greenwood",
          "custom_domain": "portal.greenwoodhigh.com",
          "subscription_plan": "pro",
          "subscription_status": "active",
          "max_students": 1500,
          "active_students": 1120,
          "created_at": "2026-09-01T00:00:00Z"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "totalRecords": 45, "totalPages": 3 }
    }
    ```

* **`POST /api/super-admin/schools`** (Provision New School)
  * **Request Body:**
    ```json
    {
      "name": "Oakridge World Academy",
      "code": "OAKRIDGE",
      "subdomain": "oakridge",
      "contact_email": "principal@oakridge.edu",
      "contact_phone": "+91-9876543210",
      "address": "Tech City Campus, Bangalore",
      "subscription_plan": "pro",
      "max_students": 2000,
      "admin_user": {
        "name": "Dr. Rajesh Verma",
        "email": "admin@oakridge.edu",
        "phone": "+91-9876543210",
        "password": "TempPassword@123"
      },
      "modules_enabled": {
        "finance": true,
        "admissions": true,
        "transport": true,
        "live_chat": true,
        "whatsapp_alerts": true,
        "sibling_discount": true
      }
    }
    ```

* **`PATCH /api/super-admin/schools/:id/modules`**
  * **Request Body:**
    ```json
    {
      "modules_enabled": {
        "transport": true,
        "biometric_attendance": true,
        "whatsapp_alerts": false
      }
    }
    ```

* **`POST /api/super-admin/schools/:id/impersonate`** (Support Login)
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "impersonation_token": "eyJhbGciOi...",
        "school": { "id": "sch-001", "name": "Greenwood High" },
        "expires_in": "1 hour"
      }
    }
    ```

* **`GET /api/super-admin/analytics/overview`**
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "total_schools": 48,
        "active_schools": 46,
        "total_students": 52400,
        "total_teachers": 3200,
        "monthly_recurring_revenue": 2400000,
        "system_health": { "database_latency_ms": 4, "server_cpu_pct": 14 }
      }
    }
    ```

---

## 3. Public & Tenant Discovery APIs
*Base Path: `/api/public` | Authentication: None (Public)*

* **`GET /api/public/resolve-tenant`**
  * **Query / Header:** `?subdomain=greenwood` or Host `greenwood.arcschool.cloud`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "school_id": "sch-001",
        "name": "Greenwood High International",
        "code": "GREENWOOD",
        "logo_url": "https://cdn.arcschool.cloud/schools/greenwood/logo.png",
        "favicon_url": "https://cdn.arcschool.cloud/schools/greenwood/favicon.ico",
        "theme": {
          "primary_color": "#1e3a8a",
          "accent_color": "#3b82f6"
        },
        "settings": {
          "academic_year": "2026-2027",
          "currency_symbol": "₹"
        },
        "modules_enabled": {
          "finance": true,
          "admissions": true,
          "transport": true
        }
      }
    }
    ```

* **`GET /api/public/lookup-school-code?code=GREENWOOD`**
  * Used by mobile apps to locate school before login.

---

## 4. Authentication & Multi-Tenant User APIs
*Base Path: `/api/user` | Authentication: Mixed*

* **`POST /api/user/login`**
  * **Request Body:**
    ```json
    {
      "email": "teacher@greenwood.edu",
      "password": "MyPassword@123",
      "school_id": "sch-001"
    }
    ```
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsIn...",
        "user": {
          "id": "u-501",
          "school_id": "sch-001",
          "name": "Pooja Sharma",
          "email": "teacher@greenwood.edu",
          "type": "teacher",
          "avatar_url": "https://..."
        }
      }
    }
    ```

* **`POST /api/user/parent-otp/send`**
  * **Request Body:** `{ "phone": "+919876543210", "school_id": "sch-001" }`

* **`POST /api/user/parent-otp/verify`**
  * **Request Body:** `{ "phone": "+919876543210", "otp": "459102", "school_id": "sch-001" }`
  * **Response (200 OK):** Returns parent JWT token and linked children array.

---

## 5. Sibling & Family Management APIs
*Base Path: `/api/siblings` | Authentication: Required*

* **`POST /api/siblings/check-match`** (Admission family search)
  * **Request Body:** `{ "phone": "+919876543210" }`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "match_found": true,
        "parent": {
          "id": "p-101",
          "father_name": "Vikram Sharma",
          "mother_name": "Anjali Sharma",
          "phone": "+919876543210"
        },
        "enrolled_children": [
          { "id": "s-201", "name": "Rahul Sharma", "class": "Grade 5-A" }
        ]
      }
    }
    ```

* **`POST /api/siblings/link-child`**
  * **Request Body:**
    ```json
    {
      "parent_id": "p-101",
      "student_id": "s-202",
      "relationship": "father",
      "apply_sibling_discount": true
    }
    ```

* **`GET /api/siblings/parent/my-children`** (Mobile Child Switcher)
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "student_id": "s-201",
          "name": "Rahul Sharma",
          "admission_number": "ADM-2024-0012",
          "class": "Grade 5-A",
          "avatar_url": "https://...",
          "pending_fee": 3500,
          "attendance_percentage": 94.2
        },
        {
          "student_id": "s-202",
          "name": "Priya Sharma",
          "admission_number": "ADM-2026-0089",
          "class": "Grade 1-B",
          "avatar_url": "https://...",
          "pending_fee": 4200,
          "attendance_percentage": 98.0
        }
      ]
    }
    ```

* **`GET /api/siblings/parent/family-dues`**
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "total_family_dues": 7700,
        "children_breakdown": [
          { "student_id": "s-201", "name": "Rahul Sharma", "due_amount": 3500 },
          { "student_id": "s-202", "name": "Priya Sharma", "due_amount": 4200 }
        ]
      }
    }
    ```

* **`POST /api/siblings/parent/single-checkout`** (Consolidated Payment Session)
  * **Request Body:**
    ```json
    {
      "student_ids": ["s-201", "s-202"],
      "total_amount": 7700,
      "payment_gateway": "razorpay"
    }
    ```
  * **Response (200 OK):** Returns Razorpay `order_id` ready for checkout.

---

## 6. Admin Panel & Academics APIs
*Base Path: `/api/admin_panel` | Authentication: Admin / Principal*

* **`GET /api/admin_panel/classes`**
* **`POST /api/admin_panel/classes`**
  * **Request Body:** `{ "name": "Grade 10", "section": "A", "room_id": "r-101", "academic_year": "2026-2027" }`
* **`GET /api/admin_panel/subjects`**
* **`POST /api/admin_panel/subjects`**
  * **Request Body:** `{ "name": "Physics", "code": "PHY101", "type": "theory", "credits": 4 }`
* **`POST /api/admin_panel/assign-class-teacher`**
  * **Request Body:** `{ "class_id": "c-101", "teacher_id": "t-201", "academic_year": "2026-2027" }`
* **`GET /api/admin_panel/timetable/:classId`**
* **`POST /api/admin_panel/timetable`**
  * **Request Body:**
    ```json
    {
      "class_id": "c-101",
      "subject_id": "sub-301",
      "teacher_id": "t-201",
      "room_id": "r-101",
      "day_of_week": "Monday",
      "period_number": 1,
      "start_time": "08:30:00",
      "end_time": "09:15:00"
    }
    ```
* **`GET /api/admin_panel/grading-scales`**
* **`PUT /api/admin_panel/grading-scales`**

---

## 7. Admission Panel APIs
*Base Path: `/api/admission_panel` | Authentication: Admin / Admission Officer*

* **`GET /api/admission_panel/dashboard`**
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "total_enrolled": 1120,
        "new_admissions_this_month": 42,
        "pending_documents": 8,
        "gender_ratio": { "male": 580, "female": 540 }
      }
    }
    ```

* **`POST /api/admission_panel/register-student`**
  * **Request Body:**
    ```json
    {
      "name": "Aarav Gupta",
      "gender": "male",
      "dob": "2018-05-12",
      "class_id": "c-102",
      "father_name": "Rohan Gupta",
      "mother_name": "Sunita Gupta",
      "phone": "+91-9876501234",
      "address": "42 Lake View Residency, Sector 4",
      "blood_group": "B+",
      "monthly_fee": 5000,
      "bus_fee": 1200,
      "bus_start_date": "2026-09-01",
      "parent_id": "p-302" // Optional if linking existing sibling
    }
    ```

* **`GET /api/admission_panel/students`**
  * **Query Params:** `class_id=&status=active&search=Aarav&page=1&limit=25`
* **`GET /api/admission_panel/students/:id`**
* **`PUT /api/admission_panel/students/:id`**
* **`POST /api/admission_panel/students/:id/leave`** (Transfer Certificate generation)
* **`GET /api/admission_panel/export/excel?class_id=c-101`**

---

## 8. Finance & Fee Management APIs
*Base Path: `/api/finance_panel` | Authentication: Admin / Accountant*

* **`GET /api/finance_panel/dashboard`**
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "today_collection": 145000,
        "monthly_collection": 4250000,
        "pending_dues_total": 850000,
        "defaulters_count": 64
      }
    }
    ```

* **`POST /api/finance_panel/collect-fee`** (Offline / Cashier Collection)
  * **Request Body:**
    ```json
    {
      "student_id": "s-201",
      "amount_paid": 5000,
      "payment_mode": "Cash",
      "remarks": "Tuition fee for September 2026",
      "fee_items": [
        { "fee_id": 1, "title": "Tuition Fee", "amount": 4500 },
        { "fee_id": 2, "title": "Transport Fee", "amount": 500 }
      ]
    }
    ```
  * **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "receipt_id": 1042,
        "receipt_number": "REC-2026-1042",
        "student_name": "Rahul Sharma",
        "amount_paid": 5000,
        "pdf_download_url": "https://api.arcschool.cloud/api/finance_panel/receipts/1042/pdf"
      }
    }
    ```

* **`GET /api/finance_panel/student-ledger/:studentId`**
* **`GET /api/finance_panel/defaulters`**
* **`POST /api/finance_panel/send-fee-reminders`**
  * **Request Body:** `{ "student_ids": ["s-201", "s-205"], "channels": ["whatsapp", "push"] }`
* **`GET /api/finance_panel/transactions`** (Income / Expense entries)
* **`POST /api/finance_panel/transactions`**
* **`GET /api/finance_panel/profit-loss`**
* **`POST /api/finance_panel/payment-gateway/webhook`**

---

## 9. Examinations & Grading APIs
*Base Path: `/api/exams` | Authentication: Required*

* **`GET /api/exams?class_id=c-101&academic_year=2026-2027`**
* **`POST /api/exams`**
  * **Request Body:**
    ```json
    {
      "title": "Half Yearly Exam 2026",
      "class_id": "c-101",
      "subject_id": "sub-301",
      "exam_date": "2026-10-15",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "max_marks": 100,
      "pass_marks": 35,
      "academic_year": "2026-2027"
    }
    ```
* **`GET /api/exams/marks-entry/:examId`**
* **`POST /api/exams/marks-entry/:examId`** (Batch Save)
  * **Request Body:**
    ```json
    {
      "records": [
        { "student_id": "s-201", "marks": 88, "remarks": "Excellent performance" },
        { "student_id": "s-202", "marks": 74, "remarks": "Good effort" }
      ]
    }
    ```
* **`GET /api/exams/report-card/:studentId?academic_year=2026-2027`**

---

## 10. Coursework & Homework APIs
*Base Path: `/api/course` | Authentication: Required*

* **`GET /api/course?class_id=c-101`**
* **`POST /api/course`**
  * **Request Body:**
    ```json
    {
      "class_id": "c-101",
      "subject_id": "sub-301",
      "title": "Chapter 4: Optics & Reflection Exercises",
      "description": "Complete numerical questions 1 through 10 from textbook.",
      "due_date": "2026-09-08T23:59:59Z",
      "attachments": [
        { "name": "Worksheet.pdf", "url": "https://cdn.arcschool.cloud/..." }
      ]
    }
    ```
* **`POST /api/course/:id/submit`** (Student Upload)
  * **Request Body:**
    ```json
    {
      "submission_text": "Completed all 10 numerical problems with diagrams attached.",
      "file_urls": ["https://cdn.arcschool.cloud/.../my_solution.pdf"]
    }
    ```
* **`GET /api/course/:id/submissions`**
* **`POST /api/course/grade-submission`**

---

## 11. Attendance Management APIs
*Base Path: `/api/attendance` | Authentication: Required*

* **`GET /api/attendance/class-sheet?class_id=c-101&date=2026-09-01`**
* **`POST /api/attendance/mark-batch`**
  * **Request Body:**
    ```json
    {
      "class_id": "c-101",
      "date": "2026-09-01",
      "records": [
        { "student_id": "s-201", "status": "present", "remarks": "" },
        { "student_id": "s-202", "status": "absent", "remarks": "Sick leave requested" }
      ]
    }
    ```
* **`GET /api/attendance/student-summary/:studentId?month=09&year=2026`**
* **`POST /api/attendance/biometric-sync`**

---

## 12. Communication, Circulars & Consents APIs
*Base Path: `/api/communication` & `/api/circulars` & `/api/consents`*

* **`GET /api/circulars?target_audience=all`**
* **`POST /api/circulars`**
  * **Request Body:**
    ```json
    {
      "title": "Annual Sports Meet 2026 Schedule",
      "content": "Dear Parents, the sports meet will commence from Oct 20...",
      "target_audience": "all",
      "file_url": "https://cdn.arcschool.cloud/circulars/sports_2026.pdf"
    }
    ```
* **`GET /api/communication/chat/messages?receiver_id=t-201`**
* **`POST /api/communication/chat/messages`**
  * **Request Body:** `{ "receiver_id": "t-201", "message": "Regarding homework extension..." }`
* **`GET /api/complaints`**
* **`POST /api/complaints`**
* **`POST /api/consents/:id/respond`**
  * **Request Body:** `{ "student_id": "s-201", "status": "approved", "remarks": "Allowed for trip" }`

---

## 13. Student & Parent Mobile App APIs
*Base Path: `/api/student_app` | Authentication: Student / Parent*

* **`GET /api/student_app/dashboard?student_id=s-201`**
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "student": { "name": "Rahul Sharma", "class": "Grade 5-A", "roll_no": "14" },
        "today_timetable": [
          { "period": 1, "subject": "Mathematics", "teacher": "Pooja Sharma", "time": "08:30" }
        ],
        "attendance_pct": 95.4,
        "pending_fee": 3500,
        "unread_circulars": 2,
        "homework_due_count": 1
      }
    }
    ```
* **`GET /api/student_app/my-academics?student_id=s-201`**
* **`GET /api/student_app/my-fees?student_id=s-201`**
* **`GET /api/student_app/my-attendance?student_id=s-201&month=09&year=2026`**
* **`GET /api/student_app/my-report-cards?student_id=s-201`**

---

## 14. Teacher Mobile App APIs
*Base Path: `/api/teacher_app` | Authentication: Teacher*

* **`GET /api/teacher_app/dashboard`**
  * **Response (200 OK):** Returns assigned periods today, pending attendance classes, and notices.
* **`GET /api/teacher_app/my-schedule`**
* **`POST /api/teacher_app/quick-attendance`**
  * **Request Body:** `{ "class_id": "c-101", "absent_student_ids": ["s-202"] }`
* **`POST /api/teacher_app/post-homework`**

---

## 15. Principal Mobile App APIs
*Base Path: `/api/principal_app` | Authentication: Principal*

* **`GET /api/principal_app/executive-summary`**
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "student_attendance_pct": 93.8,
        "staff_present_count": 68,
        "staff_total_count": 72,
        "fee_collected_today": 128000,
        "active_complaints": 3
      }
    }
    ```
* **`POST /api/principal_app/urgent-broadcast`**
  * **Request Body:** `{ "title": "School Closure Notice", "body": "Due to heavy rain, school remains closed tomorrow.", "target": "all" }`

---

## 16. Push Notifications & FCM Device Tokens
*Base Path: `/api/notifications` | Authentication: Required*

* **`POST /api/notifications/device-token`**
  * **Request Body:** `{ "fcm_token": "eY83_...", "platform": "android" }`
* **`GET /api/notifications/my-notifications?page=1&limit=20`**
* **`PATCH /api/notifications/:id/read`**
* **`PATCH /api/notifications/mark-all-read`**

---

## 17. Real-Time Socket.io Events Reference

**Server Connection**: `wss://api.arcschool.cloud`  
**Handshake Auth**: `{ token: "Bearer <JWT>" }`

### Client Joins School Rooms:
* `socket.join("school_<school_id>_announcements")`
* `socket.join("school_<school_id>_class_<class_id>")`
* `socket.join("school_<school_id>_user_<user_id>")`

### Emitted Events:
| Event Name | Direction | Payload |
| :--- | :--- | :--- |
| `circular:new` | Server -> Client | `{ "id", "title", "published_date" }` |
| `attendance:alert` | Server -> Parent | `{ "student_id", "status": "absent", "date" }` |
| `chat:message` | Bidirectional | `{ "sender_id", "receiver_id", "message", "timestamp" }` |
| `fee:payment_success`| Server -> Parent/Admin | `{ "receipt_id", "amount", "student_name" }` |
| `homework:new` | Server -> Students | `{ "class_id", "subject", "title", "due_date" }` |
