"use client";

import { motion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { FLYOUT_IN } from "@/lib/windows";

/* Notification centre — opens from the status-bar bell. */
export type Notification = {
  id: string;
  app: string;
  title: string;
  body: string;
  time: string;
};

export function NotificationsFlyout({
  items,
  onClear,
  onDismiss,
}: {
  items: Notification[];
  onClear: () => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      className="flyout notif-flyout"
      role="dialog"
      aria-label="Notifications"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={FLYOUT_IN}
    >
      <div className="notif-head">
        <h3>Notifications</h3>
        {items.length > 0 && (
          <button type="button" className="notif-clear" onClick={onClear}>
            <BellOff size={12} /> Clear all
          </button>
        )}
      </div>

      <div className="notif-list">
        {items.length === 0 && (
          <div className="notif-empty">
            <Bell size={18} />
            <p>You’re all caught up.</p>
          </div>
        )}

        {items.map((n, i) => (
          <motion.article
            key={n.id}
            className="notif-item"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...FLYOUT_IN, delay: i * 0.03 }}
          >
            <header>
              <span className="notif-app">{n.app}</span>
              <span className="notif-time">{n.time}</span>
            </header>
            <p className="notif-title">{n.title}</p>
            <p className="notif-body">{n.body}</p>
            <button type="button" className="notif-dismiss" onClick={() => onDismiss(n.id)}>
              Dismiss
            </button>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
