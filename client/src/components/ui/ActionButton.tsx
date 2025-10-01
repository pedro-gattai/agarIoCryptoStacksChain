import React from 'react';
import type { ReactNode } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  style = {}
}) => {
  const baseStyles: React.CSSProperties = {
    border: 'none',
    borderRadius: '8px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: disabled || loading ? 0.6 : 1,
    ...style
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#4ECDC4',
      color: '#000',
      '&:hover': {
        backgroundColor: '#45B7AA'
      }
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#4ECDC4',
      border: '1px solid #4ECDC4',
      '&:hover': {
        backgroundColor: '#4ECDC4',
        color: '#000'
      }
    },
    danger: {
      backgroundColor: '#FF6B6B',
      color: '#fff',
      '&:hover': {
        backgroundColor: '#E55656'
      }
    },
    success: {
      backgroundColor: '#51CF66',
      color: '#000',
      '&:hover': {
        backgroundColor: '#47B83C'
      }
    }
  };

  const sizeStyles = {
    small: {
      padding: '6px 12px',
      fontSize: '12px'
    },
    medium: {
      padding: '10px 20px',
      fontSize: '14px'
    },
    large: {
      padding: '14px 28px',
      fontSize: '16px'
    }
  };

  const finalStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size]
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      style={finalStyles}
    >
      {loading && (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      )}
      {children}
    </button>
  );
};