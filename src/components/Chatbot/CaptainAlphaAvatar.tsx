import React from 'react';
import { CHATBOT_CONFIG } from '../../services/chatbotConfig';

interface CaptainAlphaAvatarProps {
  state: 'greeting' | 'listening' | 'speaking' | 'idle';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CaptainAlphaAvatar: React.FC<CaptainAlphaAvatarProps> = ({ 
  state, 
  size = 'md', 
  className = '' 
}) => {
  const getGifUrl = () => {
    switch (state) {
      case 'listening':
        return CHATBOT_CONFIG.gifs.listening;
      case 'speaking':
        return CHATBOT_CONFIG.gifs.speaking;
      case 'greeting':
        return CHATBOT_CONFIG.gifs.greeting;
      default:
        return CHATBOT_CONFIG.gifs.greeting;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8';
      case 'lg':
        return 'w-16 h-16';
      default:
        return 'w-12 h-12';
    }
  };

  return (
    <div className={`relative ${getSizeClasses()} ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg border-2 border-white">
        <img
          src={getGifUrl()}
          alt="Chief Smile Officer"
          className="w-full h-full object-cover"
        />
      </div>
      {/* Status indicator */}
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
    </div>
  );
};

export default CaptainAlphaAvatar;


