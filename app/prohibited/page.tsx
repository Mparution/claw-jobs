import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/sanitize';

export default async function ProhibitedPage() {
  let content = '';
  try {
    const filePath = path.join(process.cwd(), 'PROHIBITED_CATEGORIES.md');
    const markdown = fs.readFileSync(filePath, 'utf-8');
    const rawHtml = await marked(markdown);
    content = sanitizeHtml(rawHtml);
  } catch (e) {
    content = '<p>Prohibited Categories document not found.</p>';
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div 
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
