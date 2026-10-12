import { describe, it, expect } from "vitest";
import { sniffFileType } from "./storage";

const pad = (arr: number[]) => new Uint8Array([...arr, ...new Array(16).fill(0)]);
const str = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

describe("sniffFileType", () => {
  it("detects allowed formats by magic bytes", () => {
    expect(sniffFileType(pad([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(sniffFileType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(sniffFileType(pad(str("%PDF-1.7")))?.mime).toBe("application/pdf");
  });
  it("rejects HTML/SVG/scripts even if renamed", () => {
    expect(sniffFileType(pad(str("<svg xmlns=")))).toBeNull();
    expect(sniffFileType(pad(str("<!DOCTYPE html>")))).toBeNull();
    expect(sniffFileType(pad(str("#!/bin/sh\nrm")))).toBeNull();
  });
});
