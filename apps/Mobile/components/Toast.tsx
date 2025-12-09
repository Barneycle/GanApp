import React, { useState, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ToastContext = createContext<any>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const toast = {
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }: { toasts: any[]; removeToast: (id: number) => void }) => {
  const insets = useSafeAreaInsets();
  
  if (toasts.length === 0) return null;

  return (
    <Modal
      transparent
      visible={toasts.length > 0}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View 
        style={[
          styles.container,
          {
            top: insets.top + 16,
            paddingHorizontal: 16,
          }
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </View>
    </Modal>
  );
};

const Toast = ({ toast, onClose }: { toast: any; onClose: () => void }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: '#ffffff',
          accentColor: '#10b981',
          textColor: '#1e293b',
          borderLeftColor: '#10b981',
        };
      case 'error':
        return {
          backgroundColor: '#ffffff',
          accentColor: '#ef4444',
          textColor: '#1e293b',
          borderLeftColor: '#ef4444',
        };
      case 'warning':
        return {
          backgroundColor: '#ffffff',
          accentColor: '#f59e0b',
          textColor: '#1e293b',
          borderLeftColor: '#f59e0b',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#ffffff',
          accentColor: '#1e40af',
          textColor: '#1e293b',
          borderLeftColor: '#1e40af',
        };
    }
  };

  const toastStyles = getStyles();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: toastStyles.backgroundColor,
          borderLeftColor: toastStyles.borderLeftColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.messageContainer}>
        <Text style={[styles.messageText, { color: toastStyles.textColor }]}>
          {toast.message}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color="#94a3b8" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    minWidth: '90%',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  messageContainer: {
    flex: 1,
    marginRight: 12,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
});

