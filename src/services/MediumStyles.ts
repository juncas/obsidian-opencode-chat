export const MEDIUM_STYLES: Record<string, string> = {
    default: `
:root {
    --medium-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    --medium-text-color: #292929;
    --medium-heading-color: #1a1a1a;
    --medium-muted: #838383;
    --medium-bg: #ffffff;
    --medium-code-bg: #f3f3f3;
    --medium-blockquote-border: #292929;
}
.medium-article {
    font-family: var(--medium-font);
    font-size: 19px;
    color: var(--medium-text-color);
    line-height: 1.6;
    background-color: var(--medium-bg);
    letter-spacing: -0.01em;
}
.medium-article h1 {
    font-size: 42px;
    font-weight: 700;
    color: var(--medium-heading-color);
    line-height: 1.2;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
}
.medium-article h2 {
    font-size: 28px;
    font-weight: 600;
    color: var(--medium-heading-color);
    margin-top: 48px;
    margin-bottom: 16px;
    letter-spacing: -0.015em;
}
.medium-article h3 {
    font-size: 22px;
    font-weight: 600;
    color: var(--medium-heading-color);
    margin-top: 32px;
    margin-bottom: 12px;
}
.medium-article p {
    margin-bottom: 24px;
    text-rendering: optimizeLegibility;
}
.medium-article strong {
    font-weight: 600;
    color: var(--medium-heading-color);
}
.medium-article em {
    font-style: italic;
    color: var(--medium-text-color);
}
.medium-article blockquote {
    margin: 32px 0;
    padding: 8px 0 8px 20px;
    border-left: 3px solid var(--medium-blockquote-border);
    color: var(--medium-muted);
    font-style: italic;
}
.medium-article blockquote p {
    margin-bottom: 16px;
}
.medium-article code:not(pre code) {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 16px;
    color: #e74c3c;
    background-color: var(--medium-code-bg);
    padding: 2px 6px;
    border-radius: 3px;
}
.medium-article pre {
    background-color: #1a1a2e;
    border-radius: 6px;
    padding: 20px;
    margin: 32px 0;
    overflow-x: auto;
}
.medium-article pre code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 14px;
    line-height: 1.6;
    color: #f8f8f2;
    display: block;
}
.medium-article ul, .medium-article ol {
    margin-bottom: 24px;
    padding-left: 24px;
}
.medium-article li {
    margin-bottom: 12px;
}
.medium-article a {
    color: #1a8917;
    text-decoration: none;
    border-bottom: 1px solid rgba(26, 137, 23, 0.3);
}
.medium-article a:hover {
    border-bottom-color: #1a8917;
}
.medium-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-size: 17px;
}
.medium-article th, .medium-article td {
    border-bottom: 1px solid #e0e0e0;
    padding: 12px 16px;
    text-align: left;
}
.medium-article th {
    font-weight: 600;
    color: var(--medium-heading-color);
}
.medium-article img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 32px auto;
}
.medium-article hr {
    border: none;
    height: 1px;
    background-color: #e0e0e0;
    margin: 48px 0;
}
.medium-article figcaption {
    text-align: center;
    font-size: 14px;
    color: var(--medium-muted);
    margin-top: 12px;
}
    `,
    tech: `
:root {
    --medium-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif;
    --medium-mono-font: "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace;
    --medium-text-color: #2c3e50;
    --medium-heading-color: #1a252f;
    --medium-accent: #3498db;
    --medium-code-color: #e74c3c;
    --medium-code-bg: #f8f9fa;
    --medium-pre-bg: #2d3748;
}
.medium-article {
    font-family: var(--medium-font);
    font-size: 18px;
    color: var(--medium-text-color);
    line-height: 1.7;
}
.medium-article h1 {
    font-family: var(--medium-mono-font);
    font-size: 36px;
    font-weight: 700;
    color: var(--medium-heading-color);
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--medium-accent);
}
.medium-article h2 {
    font-family: var(--medium-mono-font);
    font-size: 26px;
    font-weight: 600;
    color: var(--medium-heading-color);
    margin-top: 48px;
    margin-bottom: 16px;
    padding-left: 16px;
    border-left: 4px solid var(--medium-accent);
}
.medium-article h3 {
    font-family: var(--medium-mono-font);
    font-size: 20px;
    font-weight: 600;
    color: var(--medium-accent);
    margin-top: 32px;
    margin-bottom: 12px;
}
.medium-article p {
    margin-bottom: 24px;
}
.medium-article strong {
    font-weight: 600;
    color: var(--medium-heading-color);
}
.medium-article blockquote {
    margin: 32px 0;
    padding: 16px 20px;
    background-color: #f8f9fa;
    border-left: 4px solid var(--medium-accent);
    border-radius: 0 4px 4px 0;
    color: #5a6c7d;
    font-style: normal;
}
.medium-article blockquote p {
    margin-bottom: 0;
}
.medium-article code:not(pre code) {
    font-family: var(--medium-mono-font);
    font-size: 15px;
    color: var(--medium-code-color);
    background-color: var(--medium-code-bg);
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
}
.medium-article pre {
    background-color: var(--medium-pre-bg);
    border-radius: 8px;
    padding: 20px;
    margin: 32px 0;
    overflow-x: auto;
    border: 1px solid #4a5568;
}
.medium-article pre code {
    font-family: var(--medium-mono-font);
    font-size: 14px;
    line-height: 1.6;
    color: #e2e8f0;
    display: block;
}
.medium-article ul, .medium-article ol {
    margin-bottom: 24px;
    padding-left: 24px;
}
.medium-article li {
    margin-bottom: 10px;
}
.medium-article a {
    color: var(--medium-accent);
    text-decoration: none;
}
.medium-article a:hover {
    text-decoration: underline;
}
.medium-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-family: var(--medium-mono-font);
    font-size: 15px;
}
.medium-article th, .medium-article td {
    border: 1px solid #e2e8f0;
    padding: 12px 16px;
    text-align: left;
}
.medium-article th {
    background-color: #f7fafc;
    color: var(--medium-accent);
    font-weight: 600;
}
.medium-article img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 32px auto;
}
.medium-article hr {
    border: none;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--medium-accent), transparent);
    margin: 48px 0;
}
    `,
    editorial: `
:root {
    --medium-font: Georgia, "Noto Serif SC", "Source Han Serif SC", "Times New Roman", serif;
    --medium-text-color: #3a3a3a;
    --medium-heading-color: #1a1a1a;
    --medium-accent: #c0392b;
    --medium-bg: #fffbf7;
    --medium-code-bg: #f5f0e8;
}
.medium-article {
    font-family: var(--medium-font);
    font-size: 19px;
    color: var(--medium-text-color);
    line-height: 1.8;
    background-color: var(--medium-bg);
    text-rendering: optimizeLegibility;
}
.medium-article h1 {
    font-size: 44px;
    font-weight: 700;
    color: var(--medium-heading-color);
    line-height: 1.15;
    margin-bottom: 20px;
    letter-spacing: -0.02em;
}
.medium-article h2 {
    font-size: 28px;
    font-weight: 600;
    color: var(--medium-heading-color);
    margin-top: 52px;
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e8ddd0;
}
.medium-article h3 {
    font-size: 22px;
    font-weight: 600;
    color: var(--medium-heading-color);
    margin-top: 36px;
    margin-bottom: 14px;
}
.medium-article p {
    margin-bottom: 28px;
    text-align: justify;
}
.medium-article strong {
    font-weight: 700;
    color: var(--medium-heading-color);
}
.medium-article em {
    font-style: italic;
    color: var(--medium-accent);
}
.medium-article blockquote {
    margin: 36px 0;
    padding: 20px 24px;
    background-color: #faf6f0;
    border-left: 4px solid var(--medium-accent);
    border-radius: 0 6px 6px 0;
    color: #7a6a5a;
    font-style: italic;
}
.medium-article blockquote p {
    margin-bottom: 0;
}
.medium-article code:not(pre code) {
    font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
    font-size: 16px;
    color: #9c5030;
    background-color: var(--medium-code-bg);
    padding: 3px 8px;
    border-radius: 4px;
}
.medium-article pre {
    background-color: #2d2a24;
    border-radius: 8px;
    padding: 20px;
    margin: 36px 0;
    overflow-x: auto;
}
.medium-article pre code {
    font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
    font-size: 14px;
    line-height: 1.7;
    color: #e8ddd0;
    display: block;
}
.medium-article ul, .medium-article ol {
    margin-bottom: 28px;
    padding-left: 28px;
}
.medium-article li {
    margin-bottom: 12px;
}
.medium-article a {
    color: var(--medium-accent);
    text-decoration: underline;
    text-decoration-style: dotted;
}
.medium-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 28px 0;
}
.medium-article th, .medium-article td {
    border: 1px solid #e8ddd0;
    padding: 14px 18px;
    text-align: left;
}
.medium-article th {
    background-color: #faf6f0;
    font-weight: 600;
}
.medium-article img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 36px auto;
}
.medium-article hr {
    border: none;
    text-align: center;
    margin: 48px 0;
}
.medium-article hr::before {
    content: "❧";
    color: var(--medium-accent);
    font-size: 18px;
}
    `,
    minimal: `
:root {
    --medium-font: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif;
    --medium-text-color: #1a1a1a;
    --medium-muted: #666666;
    --medium-border: #e5e5e5;
}
.medium-article {
    font-family: var(--medium-font);
    font-size: 18px;
    color: var(--medium-text-color);
    line-height: 1.8;
    letter-spacing: 0.01em;
}
.medium-article h1 {
    font-size: 40px;
    font-weight: 700;
    color: var(--medium-text-color);
    text-align: center;
    margin-bottom: 48px;
    letter-spacing: -0.02em;
}
.medium-article h2 {
    font-size: 26px;
    font-weight: 600;
    color: var(--medium-text-color);
    margin-top: 56px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--medium-border);
}
.medium-article h3 {
    font-size: 20px;
    font-weight: 600;
    margin-top: 40px;
    margin-bottom: 14px;
}
.medium-article p {
    margin-bottom: 26px;
}
.medium-article strong {
    font-weight: 600;
}
.medium-article em {
    font-style: italic;
}
.medium-article blockquote {
    margin: 36px 0;
    padding: 20px 28px;
    background-color: #fafafa;
    border-left: none;
}
.medium-article blockquote p {
    margin-bottom: 0;
    color: var(--medium-muted);
}
.medium-article code:not(pre code) {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 15px;
    color: var(--medium-text-color);
    background-color: #f5f5f5;
    padding: 3px 6px;
    border-radius: 3px;
}
.medium-article pre {
    background-color: #f5f5f5;
    border: 1px solid var(--medium-border);
    border-radius: 4px;
    padding: 20px;
    margin: 32px 0;
    overflow-x: auto;
}
.medium-article pre code {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 14px;
    line-height: 1.6;
    color: var(--medium-text-color);
    display: block;
}
.medium-article ul, .medium-article ol {
    margin-bottom: 26px;
    padding-left: 24px;
}
.medium-article li {
    margin-bottom: 12px;
}
.medium-article a {
    color: var(--medium-text-color);
    text-decoration: underline;
    text-underline-offset: 3px;
}
.medium-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 32px 0;
}
.medium-article th, .medium-article td {
    border: 1px solid var(--medium-border);
    padding: 14px 18px;
    text-align: left;
}
.medium-article th {
    background-color: #fafafa;
    font-weight: 600;
}
.medium-article img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 36px auto;
}
.medium-article hr {
    border: none;
    height: 1px;
    background-color: var(--medium-border);
    margin: 48px 0;
}
    `,
    modern: `
:root {
    --medium-font: -apple-system, BlinkMacSystemFont, "Inter", "SF Pro", sans-serif;
    --medium-text-color: #334155;
    --medium-heading-color: #0f172a;
    --medium-accent: #6366f1;
    --medium-code-bg: #f1f5f9;
}
.medium-article {
    font-family: var(--medium-font);
    font-size: 18px;
    color: var(--medium-text-color);
    line-height: 1.7;
}
.medium-article h1 {
    font-size: 40px;
    font-weight: 800;
    color: var(--medium-heading-color);
    line-height: 1.1;
    margin-bottom: 24px;
    letter-spacing: -0.03em;
}
.medium-article h2 {
    font-size: 26px;
    font-weight: 700;
    color: var(--medium-heading-color);
    margin-top: 48px;
    margin-bottom: 16px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 8px;
    border-left: 4px solid var(--medium-accent);
}
.medium-article h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--medium-accent);
    margin-top: 36px;
    margin-bottom: 12px;
}
.medium-article p {
    margin-bottom: 24px;
}
.medium-article strong {
    font-weight: 600;
    color: var(--medium-heading-color);
}
.medium-article em {
    color: var(--medium-accent);
    font-style: italic;
}
.medium-article blockquote {
    margin: 32px 0;
    padding: 20px 24px;
    background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
    border-left: 4px solid var(--medium-accent);
    border-radius: 0 8px 8px 0;
    color: #475569;
}
.medium-article blockquote p {
    margin-bottom: 0;
}
.medium-article code:not(pre code) {
    font-family: "JetBrains Mono", "SF Mono", monospace;
    font-size: 15px;
    color: #7c3aed;
    background-color: var(--medium-code-bg);
    padding: 3px 8px;
    border-radius: 4px;
}
.medium-article pre {
    background-color: #1e293b;
    border-radius: 10px;
    padding: 20px;
    margin: 32px 0;
    overflow-x: auto;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.medium-article pre code {
    font-family: "JetBrains Mono", "SF Mono", monospace;
    font-size: 14px;
    line-height: 1.6;
    color: #e2e8f0;
    display: block;
}
.medium-article ul, .medium-article ol {
    margin-bottom: 24px;
    padding-left: 24px;
}
.medium-article li {
    margin-bottom: 10px;
}
.medium-article a {
    color: var(--medium-accent);
    text-decoration: none;
    font-weight: 500;
}
.medium-article a:hover {
    text-decoration: underline;
}
.medium-article table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.medium-article th {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
}
.medium-article td {
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
}
.medium-article tr:nth-child(even) {
    background-color: #f8fafc;
}
.medium-article img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 32px auto;
}
.medium-article hr {
    border: none;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7);
    border-radius: 2px;
    margin: 48px 0;
}
    `
};
