import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ActionButtonProps {
  text: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ text, onClick }) => {
  return (
    <div className="flex justify-center my-3">
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 font-medium underline hover:no-underline transition-all duration-200 ease-in-out cursor-pointer"
      >
        <span>{text}</span>
        <ChevronDown className="w-4 h-4" />
      </a>
    </div>
  );
};

export default ActionButton;

