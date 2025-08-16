import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

export interface ConfirmationOptions {
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface ConfirmationContextType {
    showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);
    const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

    const showConfirmation = useCallback((options: ConfirmationOptions): Promise<boolean> => {
        setOptions(options);
        return new Promise((resolve) => {
            setResolver({ resolve });
        });
    }, []);

    const handleAction = (value: boolean) => {
        if (resolver) {
            resolver.resolve(value);
            setOptions(null);
            setResolver(null);
        }
    };

    return (
        <ConfirmationContext.Provider value={{ showConfirmation }}>
            {children}
            {options && (
                 <ConfirmModal
                    options={options}
                    onConfirm={() => handleAction(true)}
                    onCancel={() => handleAction(false)}
                 />
            )}
        </ConfirmationContext.Provider>
    );
};
