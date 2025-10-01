import React from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
  showConfirmButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  className?: string;
  unstyled?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  showConfirmButton = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  className = '',
  unstyled = false
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl'
  };

  // For unstyled mode, just return backdrop + children
  if (unstyled) {
    return (
      <div 
        className="modal-backdrop"
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div 
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div 
        className={`modal-content ${sizeClasses[size]} ${className}`}
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '24px',
          margin: '16px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid #333',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div 
            className="modal-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: title ? '16px' : '0',
              paddingBottom: title ? '12px' : '0',
              borderBottom: title ? '1px solid #333' : 'none'
            }}
          >
            {title && (
              <h2 
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#fff'
                }}
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: 'auto'
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {(showConfirmButton || onConfirm) && (
          <div 
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #333'
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #555',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {cancelText}
            </button>
            
            {onConfirm && (
              <button
                onClick={onConfirm}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#4ECDC4',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};