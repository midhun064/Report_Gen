import { useState, useCallback } from 'react';

export type AvatarState = 'greeting' | 'listening' | 'speaking' | 'idle';

export const useAvatarState = () => {
  const [avatarState, setAvatarState] = useState<AvatarState>('greeting');

  const updateAvatar = useCallback((state: AvatarState) => {
    setAvatarState(state);
  }, []);

  const getGifUrl = useCallback((state: AvatarState): string => {
    switch (state) {
      case 'listening':
        return '/gif/Alpha_listen.gif';
      case 'speaking':
        return '/gif/alpha_speak.gif';
      case 'greeting':
        return '/gif/Greeting.gif';
      case 'idle':
      default:
        return '/gif/Greeting.gif';
    }
  }, []);

  return {
    avatarState,
    updateAvatar,
    getGifUrl: getGifUrl(avatarState)
  };
};


