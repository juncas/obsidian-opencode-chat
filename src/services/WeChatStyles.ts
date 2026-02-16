export const WECHAT_STYLES: Record<string, string> = {
    default: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 16px;
  color: #3f3f3f;
  line-height: 1.8;
  background-color: #ffffff;
  text-align: justify;
}
.wechat-article h1, .wechat-article h2, .wechat-article h3 {
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 24px;
  margin-bottom: 12px;
}
.wechat-article h1 { font-size: 22px; }
.wechat-article h2 {
  font-size: 18px;
  border-left: 3px solid #3370ff;
  padding-left: 12px;
}
.wechat-article h3 { font-size: 16px; }
.wechat-article p { margin-bottom: 16px; }
.wechat-article strong { color: #1a1a1a; font-weight: 600; }
.wechat-article a { color: #3370ff; text-decoration: none; }
.wechat-article code:not(pre code) {
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  color: #d63384;
  background-color: #f3f3f3;
  padding: 2px 6px;
  border-radius: 3px;
}
.wechat-article pre {
  background-color: #1e1e1e;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
  overflow-x: auto;
}
.wechat-article pre code {
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #d4d4d4;
  display: block;
}
.wechat-article blockquote {
  margin: 16px 0;
  padding: 16px 20px;
  background-color: #f7f7f7;
  border-left: 3px solid #3370ff;
  border-radius: 0 4px 4px 0;
  color: #888888;
}
.wechat-article ul, .wechat-article ol { margin: 16px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 8px; }
.wechat-article ul li::before {
  content: "•";
  position: absolute;
  left: -16px;
  color: #3370ff;
  font-weight: bold;
}
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}
.wechat-article th, .wechat-article td {
  border: 1px solid #e0e0e0;
  padding: 12px;
  text-align: left;
}
.wechat-article th {
  background-color: #f7f7f7;
  font-weight: 600;
}
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
    `,
    tech: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  color: #3f3f3f;
  line-height: 1.8;
  background-color: #ffffff;
}
.wechat-article h1 {
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #00d4aa;
}
.wechat-article h2 {
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-top: 36px;
  margin-bottom: 16px;
}
.wechat-article h3 {
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-top: 24px;
  margin-bottom: 12px;
}
.wechat-article p { margin-bottom: 16px; }
.wechat-article strong { color: #1a1a1a; font-weight: 600; }
.wechat-article em { color: #00d4aa; font-style: normal; }
.wechat-article blockquote {
  margin: 20px 0;
  padding: 16px 20px;
  background-color: #f0f4f8;
  border-left: 4px solid #00d4aa;
  border-radius: 0 4px 4px 0;
  color: #666666;
}
.wechat-article code:not(pre code) {
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace;
  font-size: 14px;
  color: #00d4aa;
  background-color: #e8ecf0;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #d0d7de;
}
.wechat-article pre {
  background-color: #0d1117;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
  border: 1px solid #d0d7de;
}
.wechat-article pre code {
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #e6edf3;
  display: block;
  margin-top: 16px;
}
.wechat-article ul, .wechat-article ol { margin: 16px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 8px; }
.wechat-article a { color: #00d4aa; text-decoration: none; border-bottom: 1px dashed #00a883; }
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace;
  font-size: 14px;
}
.wechat-article th, .wechat-article td {
  border: 1px solid #d0d7de;
  padding: 10px 14px;
  text-align: left;
}
.wechat-article th {
  background-color: #f0f4f8;
  color: #00d4aa;
  font-weight: 600;
}
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, #00d4aa, transparent); margin: 32px 0; }
    `,
    elegant: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  color: #4a4a4a;
  line-height: 2;
  background-color: #fffbf5;
  text-align: justify;
}
.wechat-article h1, .wechat-article h2, .wechat-article h3 {
  font-family: Georgia, "Noto Serif SC", "Source Han Serif SC", serif;
  font-weight: 600;
  color: #2c1810;
}
.wechat-article h1 {
  font-size: 24px;
  text-align: center;
  margin-bottom: 32px;
  letter-spacing: 2px;
}
.wechat-article h2 {
  font-size: 20px;
  margin-top: 40px;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8ddd0;
}
.wechat-article h3 { font-size: 17px; margin-top: 28px; margin-bottom: 12px; }
.wechat-article p { margin-bottom: 20px; text-indent: 2em; }
.wechat-article strong { color: #2c1810; font-weight: 600; }
.wechat-article em { font-style: italic; color: #8b4513; }
.wechat-article blockquote {
  margin: 24px 0;
  padding: 20px 24px;
  background-color: #faf6f0;
  border-left: 3px solid #d4a574;
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: #8c8c8c;
}
.wechat-article code:not(pre code) {
  font-family: "JetBrains Mono", Menlo, Monaco, monospace;
  font-size: 14px;
  color: #9c5030;
  background-color: #f5f0e8;
  padding: 2px 8px;
  border-radius: 4px;
}
.wechat-article pre {
  background-color: #2d2a24;
  border-radius: 8px;
  padding: 20px;
  margin: 24px 0;
  overflow-x: auto;
}
.wechat-article pre code {
  font-family: "JetBrains Mono", Menlo, Monaco, monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #e8ddd0;
  display: block;
}
.wechat-article ul, .wechat-article ol { margin: 20px 0; padding-left: 28px; }
.wechat-article li { margin-bottom: 10px; }
.wechat-article a { color: #8b4513; text-decoration: underline; text-decoration-style: dotted; }
.wechat-article table { width: 100%; border-collapse: collapse; margin: 20px 0; }
.wechat-article th, .wechat-article td {
  border: 1px solid #e8ddd0;
  padding: 12px 16px;
  text-align: left;
}
.wechat-article th {
  background-color: #faf6f0;
  font-family: Georgia, "Noto Serif SC", serif;
  font-weight: 600;
}
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; text-align: center; margin: 32px 0; }
.wechat-article hr::before { content: "✦ ✦ ✦"; color: #d4a574; font-size: 12px; letter-spacing: 16px; }
    `,
    minimal: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  font-size: 17px;
  color: #1a1a1a;
  line-height: 2;
  background-color: #ffffff;
  letter-spacing: 0.02em;
}
.wechat-article h1 {
  font-size: 28px;
  font-weight: 700;
  color: #000000;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.05em;
}
.wechat-article h2 {
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin-top: 56px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e5e5;
}
.wechat-article h3 { font-size: 17px; font-weight: 600; color: #000000; margin-top: 40px; margin-bottom: 16px; }
.wechat-article p { margin-bottom: 24px; }
.wechat-article strong { font-weight: 600; color: #000000; }
.wechat-article em { font-style: italic; }
.wechat-article blockquote {
  margin: 32px 0;
  padding: 24px 32px;
  background-color: #fafafa;
  border: none;
  border-radius: 0;
}
.wechat-article blockquote p { margin: 0; color: #666666; font-size: 16px; }
.wechat-article code:not(pre code) {
  font-family: "SF Mono", Menlo, Monaco, monospace;
  font-size: 15px;
  color: #1a1a1a;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}
.wechat-article pre {
  background-color: #f5f5f5;
  border: 1px solid #f0f0f0;
  border-radius: 0;
  padding: 24px;
  margin: 32px 0;
  overflow-x: auto;
}
.wechat-article pre code {
  font-family: "SF Mono", Menlo, Monaco, monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #1a1a1a;
  display: block;
}
.wechat-article ul, .wechat-article ol { margin: 24px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 12px; }
.wechat-article hr { border: none; height: 1px; background-color: #e5e5e5; margin: 48px 0; }
.wechat-article a { color: #1a1a1a; text-decoration: underline; text-underline-offset: 3px; }
.wechat-article table { width: 100%; border-collapse: collapse; margin: 32px 0; font-size: 15px; }
.wechat-article th, .wechat-article td { border: 1px solid #e5e5e5; padding: 14px 18px; text-align: left; }
.wechat-article th { background-color: #fafafa; font-weight: 600; }
.wechat-article img { max-width: 100%; height: auto; }
    `,
    vibrant: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  color: #374151;
  line-height: 1.8;
  background-color: #ffffff;
}
.wechat-article h1 {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: 28px;
}
.wechat-article h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-top: 36px;
  margin-bottom: 16px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 100%);
  border-radius: 8px;
  border-left: 4px solid #6366f1;
}
.wechat-article h3 { font-size: 17px; font-weight: 600; color: #6366f1; margin-top: 24px; margin-bottom: 12px; }
.wechat-article p { margin-bottom: 16px; }
.wechat-article strong { color: #1f2937; font-weight: 600; }
.wechat-article em { color: #ec4899; font-style: normal; font-weight: 500; }
.wechat-article blockquote {
  margin: 24px 0;
  padding: 20px 24px;
  background: linear-gradient(135deg, #faf5ff 0%, #fdf4ff 100%);
  border-radius: 12px;
  border: none;
}
.wechat-article blockquote p { margin: 0; color: #6b7280; }
.wechat-article code:not(pre code) {
  font-family: "Fira Code", Menlo, Monaco, monospace;
  font-size: 14px;
  color: #7c3aed;
  background-color: #f3f4f6;
  padding: 3px 8px;
  border-radius: 6px;
}
.wechat-article pre {
  background-color: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.wechat-article pre code {
  font-family: "Fira Code", Menlo, Monaco, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #cdd6f4;
  display: block;
}
.wechat-article ul { margin: 16px 0; padding-left: 8px; list-style: none; }
.wechat-article ul li { margin-bottom: 12px; padding-left: 28px; position: relative; }
.wechat-article ul li::before { content: "✦"; position: absolute; left: 0; color: #6366f1; }
.wechat-article a { color: #6366f1; text-decoration: none; font-weight: 500; }
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.wechat-article th {
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  color: white;
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
}
.wechat-article td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
.wechat-article tr:nth-child(even) { background-color: #f9fafb; }
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; height: 4px; background: linear-gradient(90deg, #6366f1, #ec4899); border-radius: 2px; margin: 32px 0; opacity: 0.3; }
    `,
    aiBlue: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  color: #2c3e50;
  line-height: 1.9;
  background-color: #ffffff;
}
.wechat-article h1 {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  position: relative;
}
.wechat-article h1::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #0066ff, #00ccff);
  border-radius: 2px;
}
.wechat-article h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a2e;
  margin-top: 40px;
  margin-bottom: 20px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
  border-radius: 8px;
  border-left: 4px solid #0066ff;
  box-shadow: 0 2px 8px rgba(0, 102, 255, 0.1);
}
.wechat-article h3 {
  font-size: 17px;
  font-weight: 600;
  color: #0066ff;
  margin-top: 28px;
  margin-bottom: 14px;
  padding-left: 12px;
  border-left: 3px solid #00ccff;
}
.wechat-article p { margin-bottom: 18px; text-align: justify; }
.wechat-article strong { color: #1a1a2e; font-weight: 600; }
.wechat-article em { color: #0066ff; font-style: italic; }
.wechat-article blockquote {
  margin: 28px 0;
  padding: 20px 24px;
  background: linear-gradient(135deg, #e8f4ff 0%, #ffffff 100%);
  border-left: 4px solid #0066ff;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 8px rgba(0, 102, 255, 0.1);
}
.wechat-article blockquote p { margin: 0; color: #5a6c7d; }
.wechat-article code:not(pre code) {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 14px;
  color: #0066ff;
  background-color: #eef4ff;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 102, 255, 0.15);
}
.wechat-article pre {
  background-color: #0d1117;
  border-radius: 10px;
  padding: 20px;
  margin: 24px 0;
  overflow-x: auto;
  border: 1px solid #30363d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.wechat-article pre code {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #e6edf3;
  display: block;
  margin-top: 8px;
}
.wechat-article ul, .wechat-article ol { margin: 20px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 10px; }
.wechat-article ul li::before { content: "●"; position: absolute; left: -18px; color: #0066ff; font-size: 12px; }
.wechat-article a { color: #0066ff; text-decoration: none; border-bottom: 1px solid #3385ff; }
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  font-size: 14px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.wechat-article th {
  background: linear-gradient(135deg, #0066ff, #0040cc);
  color: white;
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
}
.wechat-article td { padding: 12px 16px; border-bottom: 1px solid #d0e1f5; }
.wechat-article tr:nth-child(even) { background-color: #f8fbff; }
.wechat-article tr:hover { background-color: #e8f4ff; }
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, #0066ff, #00ccff, #0066ff, transparent); margin: 40px 0; }
    `,
    matrixGreen: `
.wechat-article {
  font-family: "Courier New", Courier, monospace;
  font-size: 15px;
  color: #1a1a1a;
  line-height: 1.8;
  background-color: #fafafa;
}
.wechat-article h1 {
  font-size: 24px;
  font-weight: 700;
  color: #006622;
  text-align: center;
  margin-bottom: 32px;
  padding: 16px;
  border: 2px solid #00aa33;
  border-radius: 8px;
  letter-spacing: 4px;
}
.wechat-article h2 {
  font-size: 18px;
  font-weight: 600;
  color: #008822;
  margin-top: 36px;
  margin-bottom: 18px;
  padding-left: 16px;
  border-left: 3px solid #00aa33;
}
.wechat-article h3 { font-size: 16px; font-weight: 600; color: #009933; margin-top: 28px; margin-bottom: 14px; }
.wechat-article p { margin-bottom: 16px; }
.wechat-article strong { color: #008822; font-weight: 600; }
.wechat-article em { color: #00aa33; font-style: italic; }
.wechat-article blockquote {
  margin: 24px 0;
  padding: 16px 20px;
  background-color: #e8f0e8;
  border-left: 3px solid #00aa33;
  border-radius: 0 4px 4px 0;
  color: #557755;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}
.wechat-article blockquote p { margin: 0; }
.wechat-article code:not(pre code) {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 13px;
  color: #008822;
  background-color: #e0e8e0;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #aaccbb;
}
.wechat-article pre {
  background-color: #000000;
  border-radius: 8px;
  padding: 20px;
  margin: 24px 0;
  overflow-x: auto;
  border: 1px solid #00aa33;
}
.wechat-article pre code {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #00ff41;
  display: block;
}
.wechat-article ul, .wechat-article ol { margin: 16px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 8px; }
.wechat-article ul li::before { content: ">"; position: absolute; left: -16px; color: #00aa33; font-weight: bold; }
.wechat-article a { color: #009933; text-decoration: none; border-bottom: 1px dashed #00aa33; }
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 13px;
  border: 1px solid #aaccbb;
}
.wechat-article th, .wechat-article td {
  border: 1px solid #cccccc;
  padding: 10px 14px;
  text-align: left;
}
.wechat-article th {
  background-color: #e8f0e8;
  color: #008822;
  font-weight: 600;
}
.wechat-article tr:nth-child(even) { background-color: rgba(0, 170, 51, 0.05); }
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, #00aa33, transparent); margin: 32px 0; }
    `,
    cyberPurple: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  color: #2a2a3e;
  line-height: 1.8;
  background-color: #faf8ff;
}
.wechat-article h1 {
  font-size: 26px;
  font-weight: 700;
  color: #bc13fe;
  text-align: center;
  margin-bottom: 36px;
  padding: 20px;
  background: linear-gradient(135deg, #bc13fe, #f10056);
  border-radius: 12px;
  letter-spacing: 2px;
}
.wechat-article h2 {
  font-size: 20px;
  font-weight: 600;
  color: #0ff0fc;
  margin-top: 40px;
  margin-bottom: 20px;
  padding: 12px 20px;
  background: linear-gradient(90deg, #f0e8ff, transparent);
  border-left: 4px solid #0ff0fc;
  border-radius: 0 8px 8px 0;
}
.wechat-article h3 { font-size: 17px; font-weight: 600; color: #bc13fe; margin-top: 32px; margin-bottom: 16px; }
.wechat-article p { margin-bottom: 18px; }
.wechat-article strong { color: #0ff0fc; font-weight: 600; }
.wechat-article em { color: #f10056; font-style: italic; }
.wechat-article blockquote {
  margin: 28px 0;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f5e8ff, #f0e8ff);
  border-left: 4px solid #f10056;
  border-radius: 0 8px 8px 0;
  color: #665577;
}
.wechat-article blockquote p { margin: 0; }
.wechat-article code:not(pre code) {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 14px;
  color: #8b00d4;
  background-color: #f0e0ff;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #8b00d4;
}
.wechat-article pre {
  background-color: #000000;
  border-radius: 12px;
  padding: 24px;
  margin: 28px 0;
  overflow-x: auto;
  border: 1px solid #bc13fe;
}
.wechat-article pre code {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #ffffff;
  display: block;
}
.wechat-article ul, .wechat-article ol { margin: 20px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 10px; }
.wechat-article ul li::before { content: "▸"; position: absolute; left: -18px; color: #bc13fe; }
.wechat-article a { color: #0ff0fc; text-decoration: none; border-bottom: 1px solid #0ff0fc; }
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  font-size: 14px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #bc13fe;
}
.wechat-article th {
  background: linear-gradient(135deg, #bc13fe, #8b00d4);
  color: white;
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
}
.wechat-article td { padding: 12px 16px; border-bottom: 1px solid #d0b0e0; }
.wechat-article tr:nth-child(even) { background-color: rgba(188, 19, 254, 0.1); }
.wechat-article tr:hover { background-color: rgba(15, 240, 252, 0.1); }
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, #bc13fe, #f10056, #0ff0fc, transparent); margin: 40px 0; box-shadow: 0 0 15px rgba(188, 19, 254, 0.3); }
    `,
    oceanTeal: `
.wechat-article {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  color: #334155;
  line-height: 1.9;
  background-color: #ffffff;
}
.wechat-article h1 {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 36px;
  padding-bottom: 16px;
  border-bottom: 3px solid #0891b2;
}
.wechat-article h2 {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin-top: 40px;
  margin-bottom: 20px;
  padding: 12px 20px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #14b8a6;
}
.wechat-article h3 { font-size: 17px; font-weight: 600; color: #0891b2; margin-top: 28px; margin-bottom: 14px; }
.wechat-article p { margin-bottom: 18px; text-align: justify; }
.wechat-article strong { color: #0f172a; font-weight: 600; }
.wechat-article em { color: #14b8a6; font-style: italic; }
.wechat-article blockquote {
  margin: 28px 0;
  padding: 20px 24px;
  background-color: #ecfeff;
  border-left: 4px solid #14b8a6;
  border-radius: 0 8px 8px 0;
  color: #64748b;
}
.wechat-article blockquote p { margin: 0; }
.wechat-article code:not(pre code) {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 14px;
  color: #0891b2;
  background-color: #ecfeff;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #bae6fd;
}
.wechat-article pre {
  background-color: #1e293b;
  border-radius: 10px;
  padding: 20px;
  margin: 24px 0;
  overflow-x: auto;
  border: 1px solid #334155;
  box-shadow: 0 4px 12px rgba(8, 145, 178, 0.15);
}
.wechat-article pre code {
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #e2e8f0;
  display: block;
}
.wechat-article ul, .wechat-article ol { margin: 20px 0; padding-left: 24px; }
.wechat-article li { margin-bottom: 10px; }
.wechat-article ul li::before { content: "•"; position: absolute; left: -16px; color: #0891b2; font-weight: bold; }
.wechat-article a { color: #0891b2; text-decoration: none; border-bottom: 1px solid #22d3ee; }
.wechat-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  font-size: 14px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(8, 145, 178, 0.1);
}
.wechat-article th {
  background: linear-gradient(135deg, #0891b2, #14b8a6);
  color: white;
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
}
.wechat-article td { padding: 12px 16px; border-bottom: 1px solid #bae6fd; }
.wechat-article tr:nth-child(even) { background-color: #f0f9ff; }
.wechat-article tr:hover { background-color: #ecfeff; }
.wechat-article img { max-width: 100%; height: auto; }
.wechat-article hr { border: none; height: 2px; background: linear-gradient(90deg, #f0f9ff, #22d3ee, #f0f9ff); margin: 40px 0; }
    `
};
