"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { acceptInvite, getSettings, getUser, handleAuthCallback, login, logout, oauthLogin, requestPasswordRecovery, signup, updateUser, type Settings, type User } from "@netlify/identity";

export default function AccountPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset" | "invite">("login");
  const [invite, setInvite] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const callback = await handleAuthCallback();
        const configuration = await getSettings();
        const current = await getUser();
        if (!active) return;
        setSettings(configuration);
        setUser(current);
        if (callback?.type === "recovery") setMode("reset");
        if (callback?.type === "invite") {
          setInvite(callback.token ?? "");
          setMode("invite");
        }
        if (callback?.type === "confirmation") setMessage("信箱驗證完成，已登入。");
      } catch {
        if (active) setMessage("會員服務暫時無法連線，請稍後再試。你仍可使用首頁試算。");
      } finally {
        if (active) setBusy(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setBusy(true);
    setMessage("");
    try {
      if (mode === "forgot") {
        await requestPasswordRecovery(email);
        setMessage("若信箱已註冊，請查看重設密碼郵件。");
      } else if (mode === "signup") {
        await signup(email, password);
        setUser(await getUser());
        setMessage(settings?.autoconfirm ? "註冊完成。" : "請到信箱點擊驗證連結，完成註冊。");
      } else if (mode === "reset") {
        await updateUser({ password });
        setMode("login");
        setUser(await getUser());
        setMessage("密碼已更新。");
      } else if (mode === "invite") {
        setUser(await acceptInvite(invite, password));
        setInvite("");
        setMode("login");
      } else {
        setUser(await login(email, password));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失敗，請稍後再試。");
    } finally { setBusy(false); }
  }

  const passwordOnly = mode === "reset" || mode === "invite";
  const title = { login: "會員登入", signup: "建立帳號", forgot: "忘記密碼", reset: "設定新密碼", invite: "接受邀請" }[mode];
  return <main className="account-page">
    <Link href="/">← 回接單雷達</Link>
    <h1>{user && !passwordOnly ? "我的帳號" : title}</h1>
    {message && <p role="status">{message}</p>}
    {user && !passwordOnly ? <>
      <p>{user.email}</p><p>帳號與網站服務獨立運作，不需要 ChatGPT 訂閱。</p>
      <button disabled={busy} onClick={async () => { setBusy(true); try { await logout(); setUser(null); } catch { setMessage("登出失敗，請再試一次。"); } finally { setBusy(false); } }}>登出</button>
    </> : <>
      <form onSubmit={submit}>
        {!passwordOnly && <label>電子郵件<input name="email" type="email" autoComplete="email" required /></label>}
        {mode !== "forgot" && <label>密碼<input name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>}
        <button disabled={busy || !settings}>{busy ? "處理中…" : title}</button>
      </form>
      {settings && <div className="account-actions">
        <button onClick={() => setMode("login")}>登入</button>
        {!settings.disableSignup && <button onClick={() => setMode("signup")}>建立帳號</button>}
        <button onClick={() => setMode("forgot")}>忘記密碼</button>
        {(Object.keys(settings.providers) as Array<keyof Settings["providers"]>).filter((provider) => settings.providers[provider] && provider !== "email").map((provider) => <button key={provider} onClick={() => oauthLogin(provider)}>使用 {provider} 登入</button>)}
      </div>}
    </>}
  </main>;
}
