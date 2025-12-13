import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { SweetAlert, SweetAlertProps } from './SweetAlert';

export interface SweetAlertRef {
  show: (config: Omit<SweetAlertProps, 'visible'>) => void;
}

export const SweetAlertProvider = forwardRef<SweetAlertRef, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const [alertConfig, setAlertConfig] = useState<Omit<SweetAlertProps, 'visible'> & { visible: boolean }>({
      visible: false,
    });

    useImperativeHandle(ref, () => ({
      show: (config: Omit<SweetAlertProps, 'visible'>) => {
        console.log('SweetAlertProvider: show called', config);
        setAlertConfig({
          ...config,
          visible: true,
        });
      },
    }));

    const handleClose = () => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
      if (alertConfig.onClose) {
        alertConfig.onClose();
      }
    };

    return (
      <>
        {children}
        <SweetAlert
          {...alertConfig}
          onClose={handleClose}
          onConfirm={() => {
            if (alertConfig.onConfirm) {
              alertConfig.onConfirm();
            }
            handleClose();
          }}
          onCancel={() => {
            if (alertConfig.onCancel) {
              alertConfig.onCancel();
            }
            handleClose();
          }}
        />
      </>
    );
  }
);

SweetAlertProvider.displayName = 'SweetAlertProvider';

