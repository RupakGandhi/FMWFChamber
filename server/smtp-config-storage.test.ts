import { describe, it, expect } from "vitest";
import { parseStoredSmtpConfig } from "./smtpService";

const stored = {
  enabled: true,
  host: "smtp.example.com",
  port: 587,
  secure: false,
  username: "programs@example.com",
  password: "encrypted",
  fromName: "FMWF Chamber",
  fromEmail: "programs@example.com",
};

describe("reading stored email settings", () => {
  it("reads settings returned as an object (MySQL)", () => {
    expect(parseStoredSmtpConfig(stored)).toEqual(stored);
  });

  it("reads settings returned as JSON text (MariaDB, as on production)", () => {
    const config = parseStoredSmtpConfig(JSON.stringify(stored));
    expect(config?.host).toBe("smtp.example.com");
    expect(config?.enabled).toBe(true);
    expect(config?.password).toBe("encrypted");
  });

  it("treats unreadable or empty values as not configured", () => {
    expect(parseStoredSmtpConfig("not json")).toBeNull();
    expect(parseStoredSmtpConfig(null)).toBeNull();
    expect(parseStoredSmtpConfig(undefined)).toBeNull();
  });
});
