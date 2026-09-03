import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_APP_KEY || '2269bdab49cbbe83f8c9',
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'eu',
  forceTLS: true,
});

export default echo;
