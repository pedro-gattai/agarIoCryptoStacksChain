import { useState, useCallback } from 'react';
import type { ModalState } from 'shared';

export const useModal = (initialState: Partial<ModalState> = {}) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    content: '',
    onClose: undefined,
    onConfirm: undefined,
    ...initialState
  });

  const openModal = useCallback((modalProps: Partial<ModalState>) => {
    setModal(prev => ({
      ...prev,
      isOpen: true,
      ...modalProps
    }));
  }, []);

  const closeModal = useCallback(() => {
    setModal(prev => ({
      ...prev,
      isOpen: false
    }));
    
    // Call custom onClose if provided
    if (modal.onClose) {
      modal.onClose();
    }
  }, [modal.onClose]);

  const confirmModal = useCallback(() => {
    // Call custom onConfirm if provided
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    
    closeModal();
  }, [modal.onConfirm, closeModal]);

  const updateModal = useCallback((updates: Partial<ModalState>) => {
    setModal(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  return {
    modal,
    isOpen: modal.isOpen,
    openModal,
    closeModal,
    confirmModal,
    updateModal
  };
};