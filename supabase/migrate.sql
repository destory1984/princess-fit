-- Run this if the shop reports a missing column. It adds only what was added
-- after the household table first shipped, and is safe to run more than once.
alter table household add column if not exists wardrobe  text[] not null default '{}';
alter table household add column if not exists worn      text[] not null default '{}';
alter table household add column if not exists furniture text[] not null default '{}';
alter table household add column if not exists grace     integer not null default 0;
alter table household add column if not exists learning  integer not null default 0;
alter table household add column if not exists charm     integer not null default 0;
alter table exercises add column if not exists rest_sec integer not null default 60;
