## Milestone 1 — Roles & Role-Based Dashboards

### Roles
- **Youth Cadet** (default, = existing `student` role) — browses courses, applies to opportunities
- **Mentor** (new role) — posts opportunities that go into pending approval; can be booked
- **Admin** — reviews project submissions, approves/rejects mentor opportunities, manages course video links

### Database changes (one migration)
- Add `mentor` value to `app_role` enum
- Add `pending_approval` to the implicit `opportunities.status` set (already a free `text`, no schema change — just new value `pending_approval`)
- Update opportunities INSERT policy so **mentors** insert with status forced to `pending_approval`; **admins/employers** can insert directly as `open`
- Update opportunities SELECT policy so non-admins/non-owners only see `status = 'open'` (already the case)
- Add a `mentor_bookings` table: `id, mentor_id, cadet_id, requested_at, scheduled_at, status (pending/accepted/declined/completed), note, message_thread` with RLS so mentor sees bookings from cadets that contacted them; cadet sees own bookings

### Frontend changes
- **Auth.tsx**: add role selector on signup (Cadet / Mentor). Admin is provisioned manually. Pass role via `raw_user_meta_data.signup_role`; update `handle_new_user` trigger to insert that role into `user_roles` instead of always `student`
- **useAuth**: expose `roles: app_role[]` derived from `user_roles` table; cached in context
- **Dashboard.tsx**: branch render by primary role:
  - Admin → AdminDashboard component (tabs: Pending Opportunities, Project Submissions, Course Videos)
  - Mentor → MentorDashboard (My Posted Opportunities + status badges, Booking Requests)
  - Cadet → existing dashboard
- **Opportunities page**: when mentor posts, payload status = `pending_approval`; show "Pending admin approval" badge in `tab=mine`
- **AdminDashboard**: list opportunities where `status='pending_approval'` with Approve / Reject buttons (update to `open` / `rejected`); list `project_submissions` where `status='pending'` with Approve/Reject + feedback; simple form to update `lessons.video_url` per course

### Technical notes
- `has_role` SECURITY DEFINER already exists — reuse for RLS and frontend gating
- Approve action: admin UPDATE on opportunities is already allowed by existing policy `Owners/admins can update opportunities`
- No new edge functions needed for M1
- Mentor booking UI (search mentors, request call) deferred to Milestone 4 (Mentorship hub); table created now so future milestone plugs in

### Out of scope (later milestones)
- M2: Startup Lab (AI Business Plan, Roadmap, Profit Planner)
- M3: Profile + CV/PDF export
- M4: Mentor search/booking UI, Gamification, Digital Citizenship course, Notifications