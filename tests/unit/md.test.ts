import * as mdTypes from "../../src/utils/md";

describe("Markdown Types", () => {
  it("should export all markdown type definitions", () => {
    // Verify that all expected types are exported
    expect(typeof mdTypes).toBe("object");
    
    // Check for the presence of type exports by examining the module object
    // Note: TypeScript types are not available at runtime, so we're just checking
    // that the module exports exist, not their actual type definitions
    const exportedTypes = Object.keys(mdTypes);
    
    // List of expected type exports
    const expectedTypes = [
      "MdSingleLineElement",
      "MdMultiLineElement",
      "MdListElement",
      "MdSingleLine",
      "MdMultiLine",
      "MdImageDefinition",
      "MdImage",
      "MdListItem",
      "MdTableDefinition",
      "MdTable",
      "MdCodeDefinition",
      "MdCode",
      "MdSeparator",
      "MdLink",
      "MdElements"
    ];
    
    // Verify that all expected types are in the exported types
    // This is a simple check to ensure the module structure hasn't changed
    expectedTypes.forEach(typeName => {
      // For TypeScript types, we can only verify the export name exists in the module
      expect(exportedTypes).toContain(typeName);
    });
  });
  
  // Test for type compatibility with sample data
  // This doesn't actually test the types at runtime (as they're erased during compilation)
  // but it ensures the code compiles with the expected type structure
  it("should have correctly structured type definitions", () => {
    // Create sample objects that conform to the type definitions
    // This is mainly to ensure type compatibility during compilation
    
    // Sample MdSingleLine
    const singleLine: mdTypes.MdSingleLine = {
      h1: "Heading 1",
      h2: "Heading 2"
    };
    expect(singleLine.h1).toBe("Heading 1");
    expect(singleLine.h2).toBe("Heading 2");
    
    // Sample MdMultiLine
    const multiLine: mdTypes.MdMultiLine = {
      p: "Paragraph text",
      blockquote: ["Quote line 1", "Quote line 2"]
    };
    expect(multiLine.p).toBe("Paragraph text");
    expect(Array.isArray(multiLine.blockquote)).toBe(true);
    
    // Sample MdImageDefinition
    const imgDef: mdTypes.MdImageDefinition = {
      source: "image.jpg",
      alt: "Alt text",
      title: "Image title"
    };
    expect(imgDef.source).toBe("image.jpg");
    
    // Sample MdImage
    const image: mdTypes.MdImage = {
      img: imgDef
    };
    expect(image.img).toBe(imgDef);
    
    // Sample MdListItem
    const list: mdTypes.MdListItem = {
      ul: ["Item 1", "Item 2"],
      ol: ["Ordered 1", "Ordered 2"]
    };
    expect(list.ul.length).toBe(2);
    expect(list.ol.length).toBe(2);
    
    // Sample MdTableDefinition
    const tableDef: mdTypes.MdTableDefinition = {
      headers: ["Col1", "Col2"],
      rows: [
        { Col1: "Row1Col1", Col2: "Row1Col2" },
        { Col1: "Row2Col1", Col2: "Row2Col2" }
      ]
    };
    expect(tableDef.headers.length).toBe(2);
    expect(tableDef.rows.length).toBe(2);
    
    // Sample MdTable
    const table: mdTypes.MdTable = {
      table: tableDef
    };
    expect(table.table).toBe(tableDef);
    
    // Sample MdCodeDefinition
    const codeDef: mdTypes.MdCodeDefinition = {
      language: "typescript",
      content: "const x = 1;"
    };
    expect(codeDef.language).toBe("typescript");
    
    // Sample MdCode
    const code: mdTypes.MdCode = {
      code: codeDef
    };
    expect(code.code).toBe(codeDef);
    
    // Sample MdSeparator
    const separator: mdTypes.MdSeparator = {
      hr: "---"
    };
    expect(separator.hr).toBe("---");
    
    // Sample MdLink
    const link: mdTypes.MdLink = {
      link: {
        title: "Link title",
        source: "https://example.com"
      }
    };
    expect(link.link.title).toBe("Link title");
    expect(link.link.source).toBe("https://example.com");
    
    // Test MdElements union type
    const elements: mdTypes.MdElements[] = [
      singleLine,
      multiLine,
      image,
      list,
      table,
      code,
      separator,
      link
    ];
    expect(elements.length).toBe(8);
  });
});