begin;

alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'subscriber_video', 'moderation_case', 'cms_event', 'live_session')
    and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
  or (target_type = 'youtube_live_chat' and target_resource_id is null and target_user_id is null)
);

commit;
