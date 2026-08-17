"use client";

import { Modal } from "./Modal";
import { CreateInvoiceForm } from "./CreateInvoiceForm";

export function QuickInvoiceModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="فاتورة جديدة" onClose={onClose}>
      <CreateInvoiceForm onCreated={onClose} />
    </Modal>
  );
}
