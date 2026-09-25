export async function extractTextFromFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (mimeType === 'text/plain' || ext === 'txt') {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'text/csv' || ext === 'csv') {
    return buffer.toString('utf-8');
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      sheets.push(`### Sheet: ${sheetName}\n${csv}`);
    }
    return sheets.join('\n\n');
  }

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text;
    } catch {
      return '[PDF parsing failed — please try converting to .txt or .docx]';
    }
  }

  return `[Unsupported file type: ${mimeType || ext}. Supported: PDF, DOCX, XLSX, CSV, TXT]`;
}

export function truncateContext(text: string, maxChars = 40000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Content truncated to fit context window — first 40,000 characters shown]';
}
