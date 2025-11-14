import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FormData {
  [key: string]: any;
}

export interface FormContextType {
  currentForm: string | null;
  formData: FormData;
  setCurrentForm: (form: string | null) => void;
  setFormData: (data: FormData) => void;
  clearForm: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

interface FormProviderProps {
  children: ReactNode;
}

export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  const [currentForm, setCurrentForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({});

  const clearForm = () => {
    setCurrentForm(null);
    setFormData({});
  };

  return (
    <FormContext.Provider
      value={{
        currentForm,
        formData,
        setCurrentForm,
        setFormData,
        clearForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};


