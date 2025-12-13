import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

interface SweetAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

export const SweetAlert: React.FC<SweetAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  onConfirm,
  onCancel,
  onClose,
  confirmButtonColor,
  cancelButtonColor,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onClose) {
      onClose();
    }
  };

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle',
          color: '#10b981',
          bgColor: '#d1fae5',
        };
      case 'error':
        return {
          name: 'close-circle',
          color: '#ef4444',
          bgColor: '#fee2e2',
        };
      case 'warning':
        return {
          name: 'warning',
          color: '#f59e0b',
          bgColor: '#fef3c7',
        };
      case 'question':
        return {
          name: 'help-circle',
          color: '#3b82f6',
          bgColor: '#dbeafe',
        };
      default:
        return {
          name: 'information-circle',
          color: '#3b82f6',
          bgColor: '#dbeafe',
        };
    }
  };

  const iconConfig = getIconConfig();
  const defaultConfirmColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
  const confirmColor = confirmButtonColor || defaultConfirmColor;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons name={iconConfig.name as any} size={64} color={iconConfig.color} />
          </View>

          {/* Title */}
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}

          {/* Message */}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: cancelButtonColor || '#6b7280' },
                ]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: cancelButtonColor || '#6b7280' }]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: confirmColor },
                showCancel && styles.buttonWithMargin,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWithMargin: {
    marginLeft: 0,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// Hook for easy usage
let alertInstance: {
  show: (config: Omit<SweetAlertProps, 'visible'>) => void;
} | null = null;

export const setSweetAlertInstance = (instance: typeof alertInstance) => {
  alertInstance = instance;
};

export const showSweetAlert = (config: Omit<SweetAlertProps, 'visible'>) => {
  if (alertInstance) {
    alertInstance.show(config);
  }
};

