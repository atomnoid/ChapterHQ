# ChapterHQ Database Design

## Database
MongoDB Atlas

## ORM
Prisma ORM

## Multi-Tenant Strategy

Every business collection contains:

- organizationId
- createdAt
- updatedAt
- deletedAt (Soft Delete)

Every query must be filtered using organizationId.

---

# Collections

## 1. organizations

Purpose:
Represents a tenant.

Fields:

- id
- name
- slug
- description
- logo
- website
- email
- phone
- country
- state
- city
- timezone
- status
- createdAt
- updatedAt
- deletedAt

Relations:

1 -> OrganizationSettings

1 -> Members

1 -> Roles

1 -> Committees

1 -> Events

1 -> Documents

1 -> Gallery

1 -> Notifications

1 -> Announcements

1 -> Inventory

1 -> Budgets

1 -> Expenses

1 -> AuditLogs

---

## 2. organization_settings

Purpose:

Stores organization configuration.

Fields

- id
- organizationId
- primaryColor
- secondaryColor
- logo
- favicon
- timezone
- locale
- notificationSettings
- featureFlags
- createdAt
- updatedAt

Relation

Organization 1 → 1 Settings

---

## 3. users

Purpose

Platform account.

Fields

- id
- name
- email
- image
- password(optional)
- emailVerified
- authProvider
- status
- lastLogin
- createdAt
- updatedAt

Relations

1 → Many Members

---

## 4. members

Purpose

Represents organization membership.

Fields

- id
- organizationId
- userId
- membershipId
- joinedAt
- status
- departmentId(optional)
- committeeId(optional)
- volunteerHours
- createdAt
- updatedAt
- deletedAt

Relations

Member → User

Member → Organization

Member → Committee

Member → UserRoles

Member → Attendance

Member → Registrations

---

## 5. roles

Purpose

Dynamic roles.

Fields

- id
- organizationId
- name
- description
- hierarchy
- isSystem
- createdAt
- updatedAt

Relations

Role → RolePermissions

Role → UserRoles

---

## 6. permissions

Purpose

Master permission list.

Fields

- id
- module
- action
- code
- description

Example

member.create

member.update

event.delete

finance.read

---

## 7. role_permissions

Purpose

Maps roles to permissions.

Fields

- id
- roleId
- permissionId

---

## 8. user_roles

Purpose

Assigns role to member.

Fields

- id
- memberId
- roleId
- assignedBy
- assignedAt

---

## 9. committees

Purpose

Organization committees.

Fields

- id
- organizationId
- name
- description
- parentCommitteeId(optional)
- createdAt
- updatedAt

Relations

Committee → Members

Committee → Appointments

---

## 10. appointments

Purpose

Committee positions.

Fields

- id
- committeeId
- memberId
- title
- startDate
- endDate
- status

Examples

Chair

Vice Chair

Secretary

Treasurer

These are DATA.

Never hardcoded.

---

## 11. events

Purpose

Organization events.

Fields

- id
- organizationId
- title
- description
- venue
- startDate
- endDate
- registrationRequired
- maxParticipants
- status
- createdBy

Relations

Event

↓

Registrations

↓

Attendance

↓

Certificates

---

## 12. registrations

Fields

- id
- organizationId
- eventId
- memberId
- status
- registeredAt

---

## 13. attendance

Fields

- id
- organizationId
- eventId
- memberId
- checkIn
- checkOut
- markedBy

---

## 14. certificates

Fields

- id
- organizationId
- templateId
- eventId
- memberId
- fileUrl
- issuedAt

---

## 15. certificate_templates

Fields

- id
- organizationId
- name
- background
- configuration

---

## 16. announcements

Fields

- id
- organizationId
- title
- content
- visibility
- publishedAt

---

## 17. notifications

Fields

- id
- organizationId
- memberId
- title
- body
- type
- isRead
- sentAt

---

## 18. documents

Fields

- id
- organizationId
- title
- description
- fileUrl
- uploadedBy
- createdAt

---

## 19. gallery

Fields

- id
- organizationId
- title
- imageUrl
- uploadedBy

---

## 20. inventory

Fields

- id
- organizationId
- name
- quantity
- category
- location
- status

---

## 21. budgets

Fields

- id
- organizationId
- title
- amount
- financialYear

---

## 22. expenses

Fields

- id
- organizationId
- budgetId
- title
- amount
- category
- spentBy
- spentAt

---

## 23. audit_logs

Fields

- id
- organizationId
- userId
- action
- entity
- entityId
- metadata(JSON)
- ip
- createdAt

---

## 24. sessions

Managed by Auth.js adapter.

No custom business logic.

---

# Important Indexes

Organization

slug (Unique)

Users

email (Unique)

Members

organizationId

userId

membershipId

Roles

organizationId

name

Committees

organizationId

Events

organizationId

startDate

Notifications

memberId

isRead

Attendance

eventId

memberId

Expenses

organizationId

Audit Logs

organizationId

createdAt

---

# Important Rules

✓ Every business record belongs to one organization.

✓ No hardcoded roles.

✓ No hardcoded committees.

✓ RBAC enforced on every protected action.

✓ Soft delete for business collections.

✓ Audit logging for critical operations.

✓ Configuration over code.

✓ Every feature is reusable.

✓ Server-side authorization only.

✓ Validation using Zod before business logic.

✓ Business logic only inside Service Layer.

✓ Database access only through Prisma.

✓ Organization isolation is mandatory.