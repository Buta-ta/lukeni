// lib/push-notifications.ts

const VAPID_PUBLIC_KEY = 'BBEMO-OUXLdIUv_bWAYmy4KbyLqwhZx3MIswM8ITDKelEFTO7Jdg6HgsRA1UqftEAP1SQNw9gY44QZO5HYJufyA';

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.error('SW registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await registerServiceWorker();
  if (!registration) return null;

  const permission = await requestNotificationPermission();
  if (!permission) return null;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function savePushSubscription(userId: string, subscription: PushSubscription) {
  const { endpoint } = subscription;
  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  const payload = {
    user_id: userId,
    endpoint,
    p256dh: p256dh ? btoa(String.fromCharCode(...new Uint8Array(p256dh))) : '',
    auth_key: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
    created_at: new Date().toISOString(),
  };

  const { error } = await (await import('./supabase')).supabase
    .from('push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' });

  if (error) console.error('Save push subscription error:', error);
}