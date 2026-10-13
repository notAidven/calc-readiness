-- Privacy-minimized, authenticated beta feedback. The browser sends no email, name,
-- answers, query string, or free-form device fingerprint. Ownership is the verified
-- Cognito subject; the page path, coarse browser name, and viewport only help reproduce.
create table public.bug_report (
  report_id uuid primary key,
  student_id uuid not null,
  description text not null check (char_length(description) between 10 and 2000),
  attempted_action text check (attempted_action is null or char_length(attempted_action) <= 500),
  page_path text not null check (
    char_length(page_path) <= 160 and page_path like '/%' and
    position('?' in page_path) = 0 and position('#' in page_path) = 0
  ),
  browser_name text not null check (char_length(browser_name) <= 80),
  viewport_width integer not null check (viewport_width between 240 and 10000),
  viewport_height integer not null check (viewport_height between 240 and 10000),
  status text not null default 'new' check (status in ('new', 'triaged', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index bug_report_review_queue_idx on public.bug_report (status, created_at desc);

-- Students can submit but cannot enumerate, change, or remove reports. Operations use
-- the migration/admin role to review the queue.
grant insert (
  report_id, student_id, description, attempted_action, page_path,
  browser_name, viewport_width, viewport_height
) on public.bug_report to app_service;

comment on table public.bug_report is
  'Authenticated beta bug reports. Data-minimized: no email, name, answers, query string, or raw user-agent.';
