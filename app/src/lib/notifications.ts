import { isPinnedPublisher, type SetuEvent } from '@setu/shared';
import { db } from '../db/schema';
import { useAppStore } from '../store/appStore';

function show(title: string, body: string, tag: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
  } catch {
    // Some installed-PWA browsers only allow service-worker notifications.
  }
}

/** Notify only for high-signal relationships, never for generic board noise. */
export async function notifyIncoming(events: SetuEvent[]): Promise<void> {
  if (!events.length || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const app = useAppStore.getState();
  const settings = app.settings;
  const author = app.identity?.author;
  if (!settings || !author) return;
  const circle = new Map((await db.circles.toArray()).map((member) => [member.au, member.name]));
  const watched = new Map(settings.watchedAuthors.map((member) => [member.au, member.name]));

  for (const event of events) {
    const closeName = circle.get(event.au) ?? watched.get(event.au);
    if (closeName && (event.t === 'checkin' || event.t === 'help')) {
      const state = event.st === 'safe'
        ? (settings.lang === 'bn' ? 'নিরাপদ আছেন ✅' : 'checked in SAFE ✅')
        : (settings.lang === 'bn' ? 'সাহায্য চেয়েছেন 🆘' : 'asked for help 🆘');
      show('Setu', `${closeName} ${state}`, `setu-${event.id}`);
      continue;
    }
    if ((event.t === 'reply' || event.t === 'ack') && event.re) {
      const parent = await db.events.get(event.re);
      if (parent?.au === author) {
        const body = settings.lang === 'bn'
          ? 'আপনার অনুরোধে নতুন উত্তর বা সাড়া এসেছে।'
          : 'Someone responded to your request.';
        show('Setu', body, `setu-${event.id}`);
        continue;
      }
    }
    if (
      event.t === 'bulletin' &&
      isPinnedPublisher(event.au) &&
      (!settings.gh || event.gh.startsWith(settings.gh))
    ) {
      show('Setu', event.msg ?? '', `setu-${event.id}`);
    }
  }
}
