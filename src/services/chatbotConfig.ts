import { getApiUrl } from '../config/api';

export const CHATBOT_CONFIG = {
  name: import.meta.env.VITE_CHATBOT_NAME || 'Chief Smile Officer',
  welcomeText:
    import.meta.env.VITE_CHATBOT_WELCOME || '',
  // Point to general-knowledge simple chat endpoint
  webhookUrl:
    import.meta.env.VITE_N8N_WEBHOOK_URL || getApiUrl('/ai/simple-chat'),
  avatarUrl:
    import.meta.env.VITE_CHATBOT_AVATAR_URL || '/gif/Greeting.gif',
  statusText:
    import.meta.env.VITE_CHATBOT_STATUS || 'Online',
  // GIF states for different functionalities
  gifs: {
    greeting: '/gif/Greeting.gif',
    listening: '/gif/Alpha_listen.gif',
    speaking: '/gif/alpha_speak.gif'
  },
  // Flag to disable chatbot functionality
  isDisabled: false
};


