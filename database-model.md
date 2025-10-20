# oFraud Database Model

## Overview

This document describes the complete database schema for the oFraud platform. The model implements a robust fraud reporting system with moderation workflows, revision history, community interaction, and comprehensive audit trails.

## Database Schema Visualization

You can visualize this schema at [dbdiagram.io](https://dbdiagram.io) by copying the DBML code below.

## DBML Schema

```dbml
Table users {
  id bigint [pk, increment]
  email varchar(255) [not null, unique]
  username varchar(50) [not null, unique]
  first_name varchar(100) [not null]
  last_name varchar(100) [not null]
  phone_number varchar(20)
  password_hash char(60) [not null]
  password_salt char(29) [not null]
  role enum('user','admin') [not null, default: 'user']
  is_blocked boolean [not null, default: false]
  blocked_reason varchar(255)
  blocked_by bigint
  blocked_at datetime
  privacy_accepted_at datetime
  community_rules_accepted_at datetime
  last_login_at datetime
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  updated_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  deleted_at datetime
}

Table user_block_events {
  id bigint [pk, increment]
  user_id bigint [not null]
  action enum('blocked','unblocked') [not null]
  reason varchar(255)
  blocked_by_user_id bigint [not null]
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
}

Table user_profile_audit {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  field varchar(64) [not null]
  old_value varchar(255)
  new_value varchar(255)
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (user_id, created_at)
    (field, created_at)
  }
}

Table user_security_audit {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  action varchar(50) [not null]
  metadata json
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (user_id, action, created_at)
  }
}

Table auth_refresh_tokens {
  id bigint [pk, increment]
  user_id bigint [not null]
  token_hash char(128) [not null, unique]
  expires_at datetime [not null]
  revoked_at datetime
  revoked_reason varchar(255)
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  created_by_ip varchar(45)
}

Table user_password_resets {
  id bigint [pk, increment]
  user_id bigint [not null]
  token_hash char(128) [not null, unique]
  expires_at datetime [not null]
  used_at datetime
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
}

Table categories {
  id bigint [pk, increment]
  name varchar(120) [not null, unique]
  slug varchar(140) [not null, unique]
  description text
  is_active boolean [not null, default: true]
  reports_count int [not null, default: 0]
  search_count int [not null, default: 0]
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  updated_at datetime [not null, default: `CURRENT_TIMESTAMP`]
}

Table report_rejection_reasons {
  id bigint [pk, increment]
  code varchar(50) [not null, unique]
  label varchar(120) [not null]
  description varchar(255)
  is_active boolean [not null, default: true]
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  updated_at datetime [not null, default: `CURRENT_TIMESTAMP`]
}

Table reports {
  id bigint [pk, increment]
  author_id bigint [not null]
  category_id bigint [not null]
  current_revision_id bigint
  status enum('pending','approved','rejected','removed') [not null, default: 'pending']
  reviewed_by bigint
  reviewed_at datetime
  approved_at datetime
  review_notes text
  rejection_reason_id bigint
  rejection_reason_text varchar(255)
  is_locked boolean [not null, default: false]
  is_anonymous boolean [not null, default: false]
  rating_average decimal(3,2) [not null, default: 0.00]
  rating_count int [not null, default: 0]
  published_at datetime
  deleted_at datetime
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  updated_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (status, created_at)
    (category_id, status, created_at)
  }
}

Table report_revisions {
  id bigint [pk, increment]
  report_id bigint [not null]
  version_number int [not null]
  title varchar(180)
  description text [not null]
  incident_url varchar(1024) [not null]
  publisher_host varchar(255) [not null]
  is_anonymous boolean [not null, default: false]
  created_by_user_id bigint [not null]
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (report_id, version_number) [unique]
    (publisher_host)
  }
}

Table report_media {
  id bigint [pk, increment]
  revision_id bigint [not null]
  file_url varchar(1024) [not null]
  storage_key varchar(255)
  media_type enum('image','video','file') [not null, default: 'image']
  position tinyint [not null, default: 1]
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  deleted_at datetime
  indexes {
    (revision_id, position) [unique]
  }
}

Table report_status_history {
  id bigint [pk, increment]
  report_id bigint [not null]
  from_status enum('pending','approved','rejected','removed')
  to_status enum('pending','approved','rejected','removed') [not null]
  rejection_reason_id bigint
  rejection_reason_code varchar(50)
  rejection_reason_text varchar(255)
  note varchar(255)
  changed_by_user_id bigint [not null]
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (report_id, created_at)
  }
}

Table report_ratings {
  id bigint [pk, increment]
  report_id bigint [not null]
  user_id bigint [not null]
  score tinyint [not null]
  comment varchar(500)
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  updated_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (report_id, user_id) [unique]
  }
}

Table report_comments {
  id bigint [pk, increment]
  report_id bigint [not null]
  user_id bigint [not null]
  parent_comment_id bigint
  content text [not null]
  status enum('visible','hidden','deleted') [not null, default: 'visible']
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  updated_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  deleted_at datetime
  indexes {
    (report_id, created_at)
  }
}

Table report_flags {
  id bigint [pk, increment]
  report_id bigint [not null]
  reported_by_user_id bigint [not null]
  reason_code enum('spam','abuse','copyright','other') [not null]
  details text
  status enum('pending','validated','dismissed') [not null, default: 'pending']
  handled_by_user_id bigint
  handled_at datetime
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
  indexes {
    (report_id, reported_by_user_id, reason_code) [unique]
  }
}

Table category_search_logs {
  id bigint [pk, increment]
  category_id bigint [not null]
  user_id bigint
  query varchar(255)
  created_at datetime [not null, default: `CURRENT_TIMESTAMP`]
}

Ref: users.blocked_by > users.id
Ref: user_block_events.user_id > users.id
Ref: user_block_events.blocked_by_user_id > users.id
Ref: auth_refresh_tokens.user_id > users.id
Ref: user_password_resets.user_id > users.id
Ref: reports.author_id > users.id
Ref: reports.category_id > categories.id
Ref: reports.reviewed_by > users.id
Ref: reports.rejection_reason_id > report_rejection_reasons.id
Ref: report_revisions.report_id > reports.id
Ref: report_revisions.created_by_user_id > users.id
Ref: reports.current_revision_id > report_revisions.id
Ref: report_media.revision_id > report_revisions.id
Ref: report_status_history.report_id > reports.id
Ref: report_status_history.rejection_reason_id > report_rejection_reasons.id
Ref: report_status_history.changed_by_user_id > users.id
Ref: report_ratings.report_id > reports.id
Ref: report_ratings.user_id > users.id
Ref: report_comments.report_id > reports.id
Ref: report_comments.user_id > users.id
Ref: report_comments.parent_comment_id > report_comments.id
Ref: report_flags.report_id > reports.id
Ref: report_flags.reported_by_user_id > users.id
Ref: report_flags.handled_by_user_id > users.id
Ref: category_search_logs.category_id > categories.id
Ref: category_search_logs.user_id > users.id
```

## Entity Relationships

### User System
- **users**: Core user entity with authentication, roles, and blocking capabilities
- **user_block_events**: Audit trail of user blocking/unblocking actions
- **user_profile_audit**: Tracks changes to user profile fields
- **user_security_audit**: Records security-related events (login, password changes, etc.)
- **auth_refresh_tokens**: JWT refresh tokens with revocation support
- **user_password_resets**: Password recovery tokens

### Report System
- **reports**: Main fraud report entity with moderation status
- **report_revisions**: Version history allowing edits before approval
- **report_media**: Evidence files (images, videos, documents) up to 5 per revision
- **report_status_history**: Complete audit trail of status changes
- **categories**: Fraud type taxonomy

### Community Interaction
- **report_ratings**: 1-5 star ratings with optional comments
- **report_comments**: Threaded comments with parent-child relationships
- **report_flags**: Community alerts for problematic content

### Analytics
- **category_search_logs**: Search activity tracking for insights
- **report_rejection_reasons**: Standardized moderation rejection reasons

## Enumerations

```typescript
// User roles
enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// Report lifecycle
enum ReportStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REMOVED = 'removed'
}

// Media types
enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file'
}

// Comment visibility
enum CommentStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  DELETED = 'deleted'
}

// Community flag reasons
enum ReportFlagReason {
  SPAM = 'spam',
  ABUSE = 'abuse',
  COPYRIGHT = 'copyright',
  OTHER = 'other'
}

// Flag resolution status
enum ReportFlagStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  DISMISSED = 'dismissed'
}
```

## Key Design Features

### Data Integrity
- Foreign key constraints ensure referential integrity
- Soft deletes on users and reports preserve audit trails
- Unique constraints prevent duplicate ratings and flags per user

### Audit & Traceability
- Complete history of report status changes
- User profile and security event tracking
- Block/unblock event logging

### Performance Optimizations
- Composite indexes on frequently queried columns
- Fulltext search on report content
- Denormalized counters (rating_average, rating_count)

### Versioning
- Report revisions allow edits while maintaining history
- `current_revision_id` points to the active version
- All historical revisions retained

## Database Creation

The complete MySQL DDL is available in the migration files under the `migrations/` directory. Apply them in order:

```bash
npx ts-node migrations/202412010000_init_schema.ts up
npx ts-node migrations/202412050000_rehash_passwords_with_bcrypt.ts
npx ts-node migrations/202412060001_create_user_audit_tables.ts
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
