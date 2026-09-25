import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, truncateContext } from '@/lib/parsers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max 20 MB). This file is ${(file.size / 1024 / 1024).toFixed(1)} MB` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractedText = await extractTextFromFile(buffer, file.type, file.name);
    const truncated = truncateContext(extractedText);

    return NextResponse.json({
      name: file.name,
      type: file.type,
      size: file.size,
      extractedText: truncated,
      charCount: truncated.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'File processing failed' },
      { status: 500 }
    );
  }
}
