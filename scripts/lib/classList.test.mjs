import { describe, expect, it } from "vitest";
import { cellText, findColumns, mapClassListRow } from "./classList.mjs";

const header = [
  "S/N",
  "Surname (IN CAPITAL LETTERS) e.g POPOOLA",
  "Other names e.g Olamide Bridget",
  "Sex (Male or Female)",
  "Matric No (e.g 20/3041)",
  "School Email address",
  "Personal Email address",
  "Phone number",
];
const options = { departmentId: "medicine", level: "600" };

describe("class list import", () => {
  it("finds the columns by header, below any title rows", () => {
    const found = findColumns([["600L Class list"], [], header]);
    expect(found).toEqual({
      headerIndex: 2,
      columns: { surname: 1, otherNames: 2, matric: 4, personalEmail: 6, phone: 7 },
    });
    expect(findColumns([["Name", "Email"]])).toBeNull();
  });

  it("maps a row to a user: title-cased surname, personal email as the email, phone", () => {
    const { columns } = findColumns([header]);
    const row = ["1", " POPOOLA ", "Olamide   Bridget", "Female", " 20/3041", "x", " Olamide@Gmail.com ", "0803 123 4567 | 0907…"];
    expect(mapClassListRow(row, columns, options)).toEqual({
      fullName: "Popoola Olamide Bridget",
      matricNumber: "20/3041",
      departmentId: "medicine",
      level: "600",
      email: "olamide@gmail.com",
      phone: "0803 123 4567 | 0907…",
    });
  });

  it("title-cases all-caps other names and hyphenated surnames, leaves mixed case alone", () => {
    const { columns } = findColumns([header]);
    const row = (surname, other) => ["1", surname, other, "", "18/2428", "", "a@b.co", ""];
    expect(mapClassListRow(row("ADE-BELLO", "SHARON MKPURUOMA"), columns, options).fullName).toBe(
      "Ade-Bello Sharon Mkpuruoma",
    );
    expect(mapClassListRow(row("McDonald", "Ada"), columns, options).fullName).toBe("McDonald Ada");
    // No phone -> no field.
    expect(mapClassListRow(row("OBI", "Ada"), columns, options)).not.toHaveProperty("phone");
  });

  it("skips rows with a bad matric or email", () => {
    const { columns } = findColumns([header]);
    const row = (matric, email) => ["1", "OBI", "Ada", "", matric, "", email, ""];
    expect(mapClassListRow(row("2021/34", "a@b.co"), columns, options)).toEqual({
      error: 'bad matric "2021/34"',
    });
    expect(mapClassListRow(row("21/0456", "not-an-email"), columns, options)).toEqual({
      error: 'bad personal email "not-an-email"',
    });
  });

  it("reads hyperlink, rich text, number and formula cells as text", () => {
    expect(cellText({ text: "a@b.co", hyperlink: "mailto:a@b.co" })).toBe("a@b.co");
    expect(cellText({ richText: [{ text: "PO" }, { text: "POOLA" }] })).toBe("POPOOLA");
    expect(cellText(9028281341)).toBe("9028281341");
    expect(cellText({ formula: "A1", result: "x" })).toBe("x");
    expect(cellText(null)).toBe("");
  });
});
