begin;

alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in (
    'account', 'profile', 'cms_video', 'subscriber_post', 'subscriber_video',
    'moderation_case', 'cms_event', 'live_session', 'youtube_live_chat'
  )
);

commit;
