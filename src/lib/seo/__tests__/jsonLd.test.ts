import { describe, expect, it } from "vitest";
import { jsonLdHtml } from "../jsonLd";

describe("jsonLdHtml", () => {
  it("rend un JSON qui se relit à l'identique", () => {
    const data = { "@type": "Organization", name: "Nuréa Parfums", tags: ["a", "b"] };
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });

  it("ne laisse passer aucun chevron : la balise ne peut pas se refermer", () => {
    const html = jsonLdHtml({ name: "</script><img src=x onerror=alert(1)>" });
    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
    expect((JSON.parse(html) as { name: string }).name).toBe("</script><img src=x onerror=alert(1)>");
  });

  it("échappe les terminateurs de ligne que JavaScript lit et que JSON ignore", () => {
    const html = jsonLdHtml({ name: "a b c" });
    expect(html).not.toContain(" ");
    expect(html).not.toContain(" ");
    expect((JSON.parse(html) as { name: string }).name).toBe("a b c");
  });

  it("garde les accents lisibles", () => {
    expect(jsonLdHtml({ name: "Nuréa" })).toContain("Nuréa");
  });
});
