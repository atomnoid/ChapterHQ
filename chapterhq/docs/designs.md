ChapterHQ Complete System Design

                                    CHAPTERHQ
                     Cloud Native Multi-Tenant SaaS Platform
──────────────────────────────────────────────────────────────────────────

                                  INTERNET
                                      │
                                      ▼
                               Vercel Deployment
                                      │
 ─────────────────────────────────────────────────────────────────────────
                                      │
                           Next.js Application
                                      │
          ┌───────────────────────────┴───────────────────────────┐
          │                                                       │
          ▼                                                       ▼
   Public Routes                                           Protected Routes
(Login, Register, Landing)                              Dashboard, Admin, etc.
          │                                                       │
          └───────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
                            Authentication (Auth.js)
                                      │
                                      ▼
                          Session + Current User
                                      │
                                      ▼
                        Resolve Current Organization
                                      │
                                      ▼
                        Dynamic RBAC Permission Check
                                      │
                                      ▼
                           Zod Request Validation
                                      │
                                      ▼
                           Service Layer (Business Logic)
                                      │
        ┌───────────────┬───────────────┬───────────────┐
        │               │               │               │
        ▼               ▼               ▼               ▼
 Organization      Member Service   Event Service   Finance Service
        │               │               │               │
        └───────────────┴───────────────┴───────────────┘
                                      │
                                      ▼
                           Repository Layer (Prisma)
                                      │
                                      ▼
                               MongoDB Atlas

----- -----


Database Relationship

Organization
│
├────────────── Organization Settings
│
├────────────── Members
│                  │
│                  ├──────── User
│                  │
│                  ├──────── User Roles
│                  │
│                  ├──────── Committees
│                  │
│                  └──────── Attendance
│
├────────────── Roles
│                  │
│                  └──────── Permissions
│
├────────────── Events
│                  │
│                  ├──────── Registrations
│                  ├──────── Attendance
│                  └──────── Certificates
│
├────────────── Documents
│
├────────────── Gallery
│
├────────────── Inventory
│
├────────────── Finance
│                  ├──────── Budgets
│                  └──────── Expenses
│
├────────────── Notifications
│
├────────────── Announcements
│
└────────────── Audit Logs

----- -----

REQUEST FLOW

Browser

↓

Next.js Page

↓

Server Action / API

↓

Auth.js

↓

Current User

↓

Organization Resolver

↓

Permission Middleware

↓

Zod Validation

↓

Business Service

↓

Repository

↓

Prisma

↓

MongoDB

↓

Response

----- -----

Feature Structure

src
│
├── app
│
├── features
│   │
│   ├── auth
│   ├── organization
│   ├── member
│   ├── role
│   ├── permission
│   ├── committee
│   ├── appointment
│   ├── event
│   ├── registration
│   ├── attendance
│   ├── certificate
│   ├── announcement
│   ├── notification
│   ├── finance
│   ├── inventory
│   ├── document
│   ├── gallery
│   └── cms
│
├── components
├── lib
├── services
├── repositories
├── validations
├── hooks
├── utils
├── types
└── prisma

----- -----

RBAC Flow

User

↓

Member

↓

User Role

↓

Role

↓

Role Permissions

↓

Permission

↓

API Access

----- -----

Multi-Tenant Flow

User

↓

Organization A

↓

Members

↓

Events

↓

Finance

↓

Documents



User

↓

Organization B

↓

Members

↓

Events

↓

Finance

↓

Documents

----- ----- 

Android Flow

Android App

↓

WebView

↓

ChapterHQ Website

↓

FCM Notifications

↓

Native Camera

↓

Native Downloads

↓

Deep Links

----- -----

Layered Architecture

UI

↓

Server Action / API

↓

Validation

↓

RBAC

↓

Business Service

↓

Repository

↓

Prisma

↓

MongoDB

----- -----

Folder Dependency

Page

↓

Component

↓

Action

↓

Service

↓

Repository

↓

Prisma

↓

MongoDB

---- -----

Final System

                    ChapterHQ

                     Users
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
     Authentication             Organization
          │                         │
          │         ┌───────────────┼────────────────┐
          │         │               │                │
          ▼         ▼               ▼                ▼
      Members     Roles       Committees         Events
          │         │               │                │
          │         ▼               ▼                ▼
          │    Permissions     Appointments   Registrations
          │                                        │
          │                                        ▼
          │                                  Attendance
          │                                        │
          │                                        ▼
          │                                  Certificates
          │
          ├─────────────────────────────────────────────┐
          │                                             │
          ▼                                             ▼
   Notifications                                  Announcements
          │                                             │
          ▼                                             ▼
     Documents                                     Gallery
          │
          ▼
      Inventory
          │
          ▼
       Finance
          │
          ▼
      Audit Logs