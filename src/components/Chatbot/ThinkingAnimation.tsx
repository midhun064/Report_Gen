import React, { useState, useEffect } from 'react';

interface ThinkingAnimationProps {
  isActive: boolean;
  className?: string;
}

const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ isActive, className = "" }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const thinkingSteps = [
    "Thinking...",
    "Collecting data...",
    "Checking forms..."
  ];

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    // Run through the sequence only once
    // Split 7 seconds equally: 2.33 seconds per step
    const timeouts: NodeJS.Timeout[] = [];
    
    thinkingSteps.forEach((_, index) => {
      const timeout = setTimeout(() => {
        setCurrentStep(index);
      }, index * 2333); // Each step after 2.33 seconds (7 seconds ÷ 3)
      
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={`mt-2 ${className}`}>
      <span className="text-sm text-gray-600 font-medium animate-pulse">
        {thinkingSteps[currentStep]}
      </span>
    </div>
  );
};

export default ThinkingAnimation;
