import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * 손님 화면(MY > 고객센터 > 1:1 문의하기)에서 등록한 문의를 관리자 메일로
 * 실제 전송하는 라우트예요. (사장님용 /api/owner/inquiry/route.ts와 동일한
 * 방식이에요 — 백엔드에 "문의" 전용 저장 API가 없어서, 문의는 별도 서버 저장
 * 없이 이 라우트가 곧바로 관리자 메일함으로 전달해요. 화면(support/page.tsx)
 * 에는 계속 로컬(문의 내역)로도 남겨서 손님이 "문의 내역"에서 방금 보낸
 * 내용을 바로 확인할 수 있어요.)
 *
 * 필요한 환경 변수(.env.local)는 사장님 문의와 동일한 걸 그대로 써요:
 *   ADMIN_EMAIL   - 문의를 받을 관리자 메일 주소 (여러 명이면 쉼표로 구분)
 *   SMTP_HOST     - 메일 서버 주소 (예: smtp.gmail.com, smtp.naver.com)
 *   SMTP_PORT     - 메일 서버 포트 (예: 587, 465)
 *   SMTP_SECURE   - "true"면 465(SSL) 포트용, 그 외(587 등)는 "false"
 *   SMTP_USER     - 메일 서버 로그인 계정(보통 발신자 메일 주소)
 *   SMTP_PASS     - 메일 서버 로그인 비밀번호(구글이면 "앱 비밀번호" 사용)
 *   MAIL_FROM     - 발신자로 표시할 메일 주소(생략하면 SMTP_USER를 사용해요)
 *
 * 이 값들이 비어있으면 실제로 메일을 보낼 수 없으니, 조용히 실패시키지 않고
 * 500 응답 + 안내 메시지로 화면에 그대로 알려줘요.
 */

export const runtime = "nodejs";

type InquiryRequestBody = {
  content?: string;
  customerName?: string | null;
  customerEmail?: string;
  phone?: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
};

function getTransportConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth: { user, pass },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: InquiryRequestBody;
  try {
    body = (await request.json()) as InquiryRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json(
      { ok: false, error: "문의 내용을 입력해주세요." },
      { status: 400 },
    );
  }

  const customerEmail = body.customerEmail?.trim();
  if (!customerEmail || !EMAIL_RE.test(customerEmail)) {
    return NextResponse.json(
      { ok: false, error: "답변 받으실 이메일 주소를 올바르게 입력해주세요." },
      { status: 400 },
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    // eslint-disable-next-line no-console
    console.error("[customer/inquiry] ADMIN_EMAIL 환경 변수가 설정되지 않았어요.");
    return NextResponse.json(
      {
        ok: false,
        error:
          "관리자 메일 주소가 설정되지 않아 문의를 보낼 수 없어요. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }

  const transportConfig = getTransportConfig();
  if (!transportConfig) {
    // eslint-disable-next-line no-console
    console.error(
      "[customer/inquiry] SMTP_HOST / SMTP_USER / SMTP_PASS 환경 변수가 설정되지 않았어요.",
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "메일 서버가 설정되지 않아 문의를 보낼 수 없어요. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }

  const customerName = body.customerName?.trim() || "-";
  const phone = body.phone?.trim() || "-";

  const submittedAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `[카페온 손님 1:1 문의] ${customerName}`;

  const text = [
    `이름: ${customerName}`,
    `이메일: ${customerEmail}`,
    `연락처: ${phone}`,
    `접수 시각: ${submittedAt}`,
    "",
    "문의 내용",
    content,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a;">
      <h2 style="margin: 0 0 12px;">손님 1:1 문의가 새로 등록됐어요</h2>
      <table style="border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
        <tbody>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">이름</td><td>${escapeHtml(customerName)}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">이메일</td><td>${escapeHtml(customerEmail)}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">연락처</td><td>${escapeHtml(phone)}</td></tr>
          <tr><td style="padding: 2px 12px 2px 0; color: #666;">접수 시각</td><td>${escapeHtml(submittedAt)}</td></tr>
        </tbody>
      </table>
      <div style="white-space: pre-wrap; border-top: 1px solid #eee; padding-top: 12px; font-size: 14.5px;">${escapeHtml(content)}</div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport(transportConfig);
    await transporter.sendMail({
      from: process.env.MAIL_FROM?.trim() || transportConfig.auth.user,
      to: adminEmail,
      replyTo: customerEmail,
      subject,
      text,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[customer/inquiry] 메일 전송에 실패했어요:", err);
    return NextResponse.json(
      { ok: false, error: "메일 전송에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
