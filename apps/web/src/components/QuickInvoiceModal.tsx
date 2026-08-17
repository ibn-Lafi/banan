"use client";

import { Modal } from "./Modal";
import { CreateInvoiceForm } from "./CreateInvoiceForm";

export function QuickInvoiceModal({
  onClose,
  initialCustomerId,
}: {
  onClose: () => void;
  initialCustomerId?: string;
}) {
  return (
    <Modal title="فاتورة جديدة" onClose={onClose}>
      <CreateInvoiceForm onCreated={onClose} initialCustomerId={initialCustomerId} />
    </Modal>
  );
}
