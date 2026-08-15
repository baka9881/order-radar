"use client";

import { FormEvent, useState } from "react";

export function SupportForm() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("problem");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setStatus("");
    try {
      const prefix = category === "privacy" ? "[資料與帳號] " : category === "feature" ? "[功能建議] " : "[使用問題] ";
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, category: category === "feature" ? "feature" : "problem", message: `${prefix}${message}` }),
      });
      if (!response.ok) throw new Error("send-failed");
      setMessage("");
      setStatus("已收到，我們會依你留下的 Email 回覆。");
    } catch {
      setStatus("暫時無法送出，請稍後再試。");
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="legal-support-form" onSubmit={submit}>
      <label>
        <span>問題類型</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="problem">使用問題</option>
          <option value="privacy">資料與帳號</option>
          <option value="feature">功能建議</option>
        </select>
      </label>
      <label>
        <span>聯絡 Email</span>
        <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        <span>說明</span>
        <textarea required minLength={5} maxLength={1400} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="請描述使用情況；若是資料刪除要求，請說明使用的帳號 Email。" />
      </label>
      <button disabled={sending} type="submit">{sending ? "送出中…" : "送出問題"}</button>
      {status ? <p role="status">{status}</p> : null}
    </form>
  );
}
