# Becan admin

The internal dashboard where Admins manage Accounts, the Catalog and Course content. Shared terms
(Student, Account, Course, Chapter, Lesson, Enrollment, Session, Plan, Allowance, Usage, Period) are
defined in the backend's `GLOSSARY.md`, which also holds the Admin terms below and the content terms
Admins work with most: Draft, Archived Course, Content version and Chapter replacement.

## Language

**Admin dashboard**:
This app: the internal place where Admins manage Becan.
_Avoid_: back office, CMS, panel, admin portal

**Role**:
The set of permissions an Account holds. There are two: Student, which every Account starts with,
and Admin.
_Avoid_: account type, user type, normal user, level

**Admin**:
A person whose Account holds the Admin Role, which lets them run the Admin dashboard and study any
Chapter without limits. An Admin may also study, but is never counted as a Student for Usage.
_Avoid_: staff, superuser, moderator, operator

**Ban**:
An Admin's block on an Account that ends its Device sessions and stops it signing in, until an Admin
lifts it or its set end passes. The Account and its history are kept.
_Avoid_: suspension, deactivation, block

**Account removal**:
Permanently erasing an Account and everything tied to it. Unlike a Ban, it cannot be undone.
_Avoid_: deactivation, Ban

**Impersonation**:
An Admin acting as another Account for a limited time to see what its owner sees. It never starts a
Session and never targets another Admin.
_Avoid_: log in as, masquerade

**Admin Session**:
A Session an Admin starts. It needs no Enrollment, may open an unpublished Chapter, is not bound by
any Allowance and never counts as Usage.
_Avoid_: test session, preview session, unlimited session

**Audit log**:
The record of every Admin action: who acted, on which Account or Course, what changed, and when.
_Avoid_: activity log, history
