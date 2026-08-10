begin;

drop function public.process_stripe_vip_checkout_event(
  text, text, timestamptz, text, uuid, uuid, public.vip_offer_code, text, text, text
);
drop function public.cancel_own_vip_checkout(uuid);
drop function public.bind_own_vip_checkout_session(uuid, text, timestamptz);
drop function public.bind_own_vip_customer(uuid, text);
drop function public.begin_own_vip_checkout(public.vip_offer_code);
drop function public.get_own_vip_orders();
drop function public.get_vip_offer_availability();
drop function private.append_vip_commerce_audit(text, uuid, text);

delete from public.audit_events where target_type = 'commerce_order';

drop table private.vip_commerce_orders;
drop type public.vip_order_status;
drop type public.vip_offer_code;

alter table public.audit_events drop constraint audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check check (action in (
  'profile.display_name_updated', 'role.assigned', 'role.removed', 'account.blocked', 'account.restored',
  'account.email_change_requested', 'cms.video_created', 'cms.video_updated', 'cms.video_published',
  'cms.video_unpublished', 'cms.video_deleted', 'cms.video_featured', 'cms.video_unfeatured', 'cms.video_reordered',
  'subscription.checkout_started', 'subscription.portal_opened', 'subscription.state_synced',
  'subscriber.post_created', 'subscriber.post_updated', 'subscriber.post_published', 'subscriber.post_unpublished', 'subscriber.post_deleted',
  'subscriber.bunny_video_upload_started', 'subscriber.bunny_video_updated', 'subscriber.bunny_video_published',
  'subscriber.bunny_video_unpublished', 'subscriber.bunny_video_removed',
  'moderation.case_created', 'moderation.case_updated', 'moderation.case_assigned', 'moderation.case_unassigned',
  'moderation.case_status_changed', 'moderation.case_deleted',
  'cms.event_created', 'cms.event_updated', 'cms.event_published', 'cms.event_unpublished', 'cms.event_archived', 'cms.event_restored', 'cms.event_deleted',
  'live.session_configured', 'live.session_status_changed', 'live.chat_message_deleted', 'live.chat_user_timed_out', 'live.chat_user_banned', 'live.chat_user_unrestricted',
  'youtube.chat_message_deleted', 'youtube.chat_user_timed_out', 'youtube.chat_user_hidden', 'youtube.chat_message_sent'
));

alter table public.audit_events drop constraint audit_events_target_type_check;
alter table public.audit_events add constraint audit_events_target_type_check check (
  target_type in (
    'account', 'profile', 'cms_video', 'subscriber_post', 'subscriber_video',
    'moderation_case', 'cms_event', 'live_session', 'youtube_live_chat'
  )
);

alter table public.audit_events drop constraint audit_events_target_reference_check;
alter table public.audit_events add constraint audit_events_target_reference_check check (
  (target_type in ('cms_video', 'subscriber_post', 'subscriber_video', 'moderation_case', 'cms_event', 'live_session')
    and target_resource_id is not null and target_user_id is null)
  or (target_type in ('account', 'profile') and target_resource_id is null)
  or (target_type = 'youtube_live_chat' and target_resource_id is null and target_user_id is null)
);

commit;
