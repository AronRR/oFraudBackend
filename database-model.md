# Ofraud Database Model

The following specification captures the data model we are now standardising on for the Ofraud platform. It mirrors the schema shared in the latest iteration and focuses on the moderation workflows, revision history, analytics hooks, and user safety requirements gathered so far.

## dbdiagram.io Schema

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

## MySQL Schema (DDL)

```sql
CREATE DATABASE IF NOT EXISTS ofraud
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE ofraud;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NULL,
  password_hash CHAR(60) NOT NULL,
  password_salt CHAR(29) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  blocked_reason VARCHAR(255) NULL,
  blocked_by BIGINT UNSIGNED NULL,
  blocked_at DATETIME NULL,
  privacy_accepted_at DATETIME NULL,
  community_rules_accepted_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uniq_users_email (email),
  UNIQUE KEY uniq_users_username (username),
  KEY idx_users_blocked_role (is_blocked, role),
  KEY idx_users_last_login (last_login_at),
  CONSTRAINT fk_users_blocked_by FOREIGN KEY (blocked_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_block_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  action ENUM('blocked','unblocked') NOT NULL,
  reason VARCHAR(255) NULL,
  blocked_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_block_events_user_id (user_id),
  CONSTRAINT fk_block_events_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_block_events_actor FOREIGN KEY (blocked_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_ip VARCHAR(45) NULL,
  KEY idx_refresh_tokens_user_id (user_id, expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_password_resets_user_id (user_id, expires_at),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  reports_count INT UNSIGNED NOT NULL DEFAULT 0,
  search_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE report_rejection_reasons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  current_revision_id BIGINT UNSIGNED NULL,
  status ENUM('pending','approved','rejected','removed') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  approved_at DATETIME NULL,
  review_notes TEXT NULL,
  rejection_reason_id BIGINT UNSIGNED NULL,
  rejection_reason_text VARCHAR(255) NULL,
  is_locked TINYINT(1) NOT NULL DEFAULT 0,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  rating_average DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count INT UNSIGNED NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_reports_status_created (status, created_at),
  KEY idx_reports_category_status_created (category_id, status, created_at),
  KEY idx_reports_author (author_id),
  CONSTRAINT fk_reports_author FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_category FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reports_rejection_reason FOREIGN KEY (rejection_reason_id) REFERENCES report_rejection_reasons(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE report_revisions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  title VARCHAR(180) NULL,
  description TEXT NOT NULL,
  incident_url VARCHAR(1024) NOT NULL,
  publisher_host VARCHAR(255) NOT NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_report_version (report_id, version_number),
  KEY idx_report_revisions_report (report_id),
  KEY idx_report_revisions_host (publisher_host),
  FULLTEXT KEY ft_revisions_content (title, description),
  CONSTRAINT fk_revisions_report FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_revisions_author FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE reports
  ADD CONSTRAINT fk_reports_current_revision
  FOREIGN KEY (current_revision_id) REFERENCES report_revisions(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE report_media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  revision_id BIGINT UNSIGNED NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  storage_key VARCHAR(255) NULL,
  media_type ENUM('image','video','file') NOT NULL DEFAULT 'image',
  position TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uniq_media_revision_position (revision_id, position),
  KEY idx_media_revision (revision_id),
  CONSTRAINT fk_media_revision FOREIGN KEY (revision_id) REFERENCES report_revisions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE report_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  from_status ENUM('pending','approved','rejected','removed') NULL,
  to_status ENUM('pending','approved','rejected','removed') NOT NULL,
  rejection_reason_id BIGINT UNSIGNED NULL,
  rejection_reason_code VARCHAR(50) NULL,
  rejection_reason_text VARCHAR(255) NULL,
  note VARCHAR(255) NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status_history_report_created (report_id, created_at),
  CONSTRAINT fk_status_history_report FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_reason FOREIGN KEY (rejection_reason_id) REFERENCES report_rejection_reasons(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE report_ratings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  score TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rating_report_user (report_id, user_id),
  KEY idx_ratings_report (report_id),
  KEY idx_ratings_user (user_id),
  CONSTRAINT chk_rating_score CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT fk_ratings_report FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE report_comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  parent_comment_id BIGINT UNSIGNED NULL,
  content TEXT NOT NULL,
  status ENUM('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_comments_report_created (report_id, created_at),
  KEY idx_comments_parent (parent_comment_id),
  CONSTRAINT fk_comments_report FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES report_comments(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE report_flags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT UNSIGNED NOT NULL,
  reported_by_user_id BIGINT UNSIGNED NOT NULL,
  reason_code ENUM('spam','abuse','copyright','other') NOT NULL,
  details TEXT NULL,
  status ENUM('pending','validated','dismissed') NOT NULL DEFAULT 'pending',
  handled_by_user_id BIGINT UNSIGNED NULL,
  handled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_flag_report_user_reason (report_id, reported_by_user_id, reason_code),
  KEY idx_flags_report (report_id),
  KEY idx_flags_status (status),
  CONSTRAINT fk_flags_report FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_flags_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_flags_handler FOREIGN KEY (handled_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE category_search_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  query VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_category_search_category (category_id),
  KEY idx_category_search_user (user_id),
  KEY idx_category_search_created (created_at),
  CONSTRAINT fk_category_search_category FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_category_search_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW report_admin_actions AS
SELECT
  h.id AS action_id,
  h.report_id,
  h.from_status,
  h.to_status,
  COALESCE(h.rejection_reason_text, rr.label) AS reason_label,
  h.rejection_reason_code,
  h.note,
  h.changed_by_user_id,
  h.created_at
FROM report_status_history h
LEFT JOIN report_rejection_reasons rr ON h.rejection_reason_id = rr.id
UNION ALL
SELECT
  f.id * -1 AS action_id,
  f.report_id,
  NULL AS from_status,
  CONCAT('flag_', f.status) AS to_status,
  f.reason_code AS reason_label,
  f.reason_code AS rejection_reason_code,
  f.details AS note,
  f.handled_by_user_id,
  f.created_at
FROM report_flags f;
```

## Entity Relationship Notes

- **users** manage authentication and account status. Administrators are distinguished via the `role` enum, while `is_blocked` and `user_block_events` capture enforcement history and auditing trails.
- **reports** anchor the fraud submissions. They always point at a **categories** row, maintain moderation state (`status` and `report_status_history`), and optionally track the latest approved **report_revisions** entry through `current_revision_id`.
- **report_revisions** allow authors to edit while a report is pending. Once approved, `current_revision_id` freezes the canonical version unless moderation triggers more changes.
- **report_media** ties ordered evidence assets to a specific revision, supporting up to five images or alternative file types.
- **report_rejection_reasons** standardise administrator justifications, and `report_status_history` records every transition (including free-form notes and overrides).
- **report_ratings** and **report_comments** capture community feedback on approved reports; unique constraints prevent duplicate ratings by the same user and support threaded conversations via `parent_comment_id`.
- **report_flags** allow community escalation of problematic content; unique tuples keep the signal clean while `handled_by_user_id` tracks administrator resolution.
- **category_search_logs** and the `reports_count`/`search_count` counters on **categories** enable aggregated insights and trending metrics.
- **auth_refresh_tokens** and **user_password_resets** provide secure credential rotation flows, while `user_sessions` (if needed) can be derived from refresh token activity.

## Enumerations

- `UserRole`: `user`, `admin`.
- `ReportStatus`: `pending`, `approved`, `rejected`, `removed`.
- `BlockAction`: `blocked`, `unblocked` (used in `user_block_events`).
- `MediaType`: `image`, `video`, `file`.
- `CommentStatus`: `visible`, `hidden`, `deleted`.
- `ReportFlagReason`: `spam`, `abuse`, `copyright`, `other`.
- `ReportFlagStatus`: `pending`, `validated`, `dismissed`.

## TypeORM Entity Sketches

The following snippets illustrate how the schema can be implemented with NestJS + TypeORM. Relations use lazy loading disabled (default) and reflect the foreign-key constraints defined above.

```ts
// src/modules/users/user-role.enum.ts
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum BlockAction {
  BLOCKED = 'blocked',
  UNBLOCKED = 'unblocked',
}

// src/modules/reports/report-status.enum.ts
export enum ReportStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REMOVED = 'removed',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
}

export enum CommentStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

export enum ReportFlagReason {
  SPAM = 'spam',
  ABUSE = 'abuse',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

export enum ReportFlagStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  DISMISSED = 'dismissed',
}
```

```ts
// src/modules/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../user-role.enum';
import { Report } from '../../reports/entities/report.entity';
import { ReportComment } from '../../reports/entities/report-comment.entity';
import { ReportRating } from '../../reports/entities/report-rating.entity';
import { ReportStatusHistory } from '../../reports/entities/report-status-history.entity';
import { ReportFlag } from '../../reports/entities/report-flag.entity';
import { ReportRevision } from '../../reports/entities/report-revision.entity';
import { AuthRefreshToken } from '../../auth/entities/auth-refresh-token.entity';
import { UserBlockEvent } from './user-block-event.entity';

@Entity({ name: 'users' })
@Unique('uq_users_email', ['email'])
@Unique('uq_users_username', ['username'])
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 50 })
  username: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string | null;

  @Column({ name: 'password_hash', type: 'char', length: 60 })
  passwordHash: string;

  @Column({ name: 'password_salt', type: 'char', length: 29 })
  passwordSalt: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  @Index('idx_users_role')
  role: UserRole;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  @Index('idx_users_is_blocked')
  isBlocked: boolean;

  @Column({ name: 'blocked_reason', length: 255, nullable: true })
  blockedReason?: string | null;

  @Column({ name: 'blocked_at', type: 'timestamp', nullable: true })
  blockedAt?: Date | null;

  @Column({ name: 'blocked_by', type: 'bigint', nullable: true })
  blockedBy?: string | null;

  @Column({ name: 'privacy_accepted_at', type: 'timestamp', nullable: true })
  privacyAcceptedAt?: Date | null;

  @Column({ name: 'community_rules_accepted_at', type: 'timestamp', nullable: true })
  communityRulesAcceptedAt?: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => Report, (report) => report.author)
  reports: Report[];

  @OneToMany(() => ReportComment, (comment) => comment.author)
  comments: ReportComment[];

  @OneToMany(() => ReportRating, (rating) => rating.author)
  ratings: ReportRating[];

  @OneToMany(() => ReportStatusHistory, (history) => history.changedBy)
  statusChanges: ReportStatusHistory[];

  @OneToMany(() => ReportFlag, (flag) => flag.handledBy)
  handledFlags: ReportFlag[];

  @OneToMany(() => ReportRevision, (revision) => revision.createdBy)
  revisions: ReportRevision[];

  @OneToMany(() => AuthRefreshToken, (token) => token.user)
  refreshTokens: AuthRefreshToken[];

  @OneToMany(() => UserBlockEvent, (event) => event.user)
  blockEvents: UserBlockEvent[];
}
```

```ts
// src/modules/users/entities/user-block-event.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { BlockAction } from '../user-role.enum';
import { User } from './user.entity';

@Entity({ name: 'user_block_events' })
export class UserBlockEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => User, (user) => user.blockEvents, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: BlockAction })
  action: BlockAction;

  @Column({ length: 255, nullable: true })
  reason?: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  blockedBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
```

```ts
// src/modules/reports/entities/report.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../taxonomy/entities/category.entity';
import { ReportStatus } from '../report-status.enum';
import { ReportRevision } from './report-revision.entity';
import { ReportStatusHistory } from './report-status-history.entity';
import { ReportRating } from './report-rating.entity';
import { ReportComment } from './report-comment.entity';
import { ReportFlag } from './report-flag.entity';

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => User, (user) => user.reports, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => Category, (category) => category.reports, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  @Index('idx_reports_status_created')
  status: ReportStatus;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ name: 'rating_average', type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAverage: string;

  @Column({ name: 'rating_count', type: 'int', unsigned: true, default: 0 })
  ratingCount: number;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string | null;

  @Column({ name: 'rejection_reason_text', length: 255, nullable: true })
  rejectionReasonText?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy?: User | null;

  @ManyToOne(() => ReportRevision, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_revision_id' })
  currentRevision?: ReportRevision | null;

  @OneToMany(() => ReportRevision, (revision) => revision.report)
  revisions: ReportRevision[];

  @OneToMany(() => ReportStatusHistory, (history) => history.report)
  statusHistory: ReportStatusHistory[];

  @OneToMany(() => ReportRating, (rating) => rating.report)
  ratings: ReportRating[];

  @OneToMany(() => ReportComment, (comment) => comment.report)
  comments: ReportComment[];

  @OneToMany(() => ReportFlag, (flag) => flag.report)
  flags: ReportFlag[];
}
```

```ts
// src/modules/reports/entities/report-revision.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Report } from './report.entity';
import { User } from '../../users/entities/user.entity';
import { ReportMedia } from './report-media.entity';

@Entity({ name: 'report_revisions' })
@Unique('uq_report_version', ['report', 'versionNumber'])
export class ReportRevision {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => Report, (report) => report.revisions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: Report;

  @Column({ name: 'version_number', type: 'int', unsigned: true })
  versionNumber: number;

  @Column({ length: 180, nullable: true })
  title?: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'incident_url', length: 1024 })
  incidentUrl: string;

  @Column({ name: 'publisher_host', length: 255 })
  @Index('idx_report_revisions_host')
  publisherHost: string;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @ManyToOne(() => User, (user) => user.revisions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => ReportMedia, (media) => media.revision)
  media: ReportMedia[];
}
```

Additional entity classes follow the same pattern and can be expanded as the implementation progresses (ratings, comments, flags, status history, etc.).

## Indexing and Performance Considerations

- Composite indexes on `reports` support moderation queues (`status`, `created_at`) and category filtering (`category_id`, `status`, `created_at`).
- `report_revisions` stores a full-text index for title/description search, aiding in fraud pattern discovery.
- `report_media` enforces ordering per revision with a unique index (`revision_id`, `position`).
- `report_ratings` and `report_flags` rely on unique tuples to prevent duplicate submissions per user.
- Audit tables (`user_block_events`, `user_profile_audit`, `user_security_audit`, `report_status_history`) retain chronological ordering via indexes on `(user_id, created_at)` or `(entity_id, created_at)` depending on the context.
- `category_search_logs` indexes category, user, and timestamp columns so product analytics can aggregate trends efficiently.

This document will continue to evolve alongside new product decisions, but it should serve as the baseline schema for implementing Ofraud with NestJS and TypeORM.

## Professional Assessment

- **Solidez relacional:** el modelo garantiza integridad referencial estricta entre usuarios, reportes y sus entidades sat茅lite. Los `ON DELETE`/`ON UPDATE` definidos evitan datos hu茅rfanos y permiten conservar auditor铆a hist贸rica sin sacrificar consistencia.
- **Moderaci髇 trazable:** las tablas `report_status_history`, `report_flags`, `user_block_events`, `user_profile_audit` y `user_security_audit` ofrecen un rastro completo de decisiones administrativas, lo cual facilita revisiones posteriores y m閠ricas de cumplimiento.
- **Flexibilidad para iterar:** el uso de `report_revisions` y `report_media` desacopla el contenido din谩mico de un reporte de su estado moderado, permitiendo ediciones controladas y versiones publicadas claramente identificadas.
- **Escalabilidad de consultas:** los 铆ndices compuestos en colas de revisi贸n, filtros por categor铆a y contadores en `categories` ofrecen una base s贸lida para dashboards y listados sin requerir desnormalizaci贸n temprana.
- **Aspectos a vigilar:** al crecer el volumen de archivos y revisiones se recomienda evaluar almacenamiento externo para `report_media` y tareas de limpieza programada sobre `auth_refresh_tokens`/`user_password_resets` para mantener la base ligera.
