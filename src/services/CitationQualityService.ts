export interface CitationCoverageReport {
    totalClaims: number;
    citedClaims: number;
    uncitedClaims: string[];
    sourceCount: number;
    coverage: number;
}

const WIKI_LINK_REGEX = /\[\[[^\]]+\]\]/;
const MARKDOWN_LINK_REGEX = /\[[^\]]+\]\([^)]+\)/;

export class CitationQualityService {
    evaluate(text: string): CitationCoverageReport {
        const lines = text.split(/\r?\n/);
        let inCodeBlock = false;
        let inSourceSection = false;

        let sourceCount = 0;
        let totalClaims = 0;
        let citedClaims = 0;
        const uncitedClaims: string[] = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
                continue;
            }

            if (line.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                continue;
            }

            if (inCodeBlock) {
                continue;
            }

            if (/^#{1,6}\s+/u.test(line)) {
                inSourceSection = /source/iu.test(line);
                continue;
            }

            if (inSourceSection) {
                if (this.hasCitation(line)) {
                    sourceCount += 1;
                }
                continue;
            }

            const claimCandidate = this.normalizeClaimLine(line);
            if (!claimCandidate) {
                continue;
            }

            totalClaims += 1;
            if (this.hasCitation(claimCandidate)) {
                citedClaims += 1;
                continue;
            }

            if (uncitedClaims.length < 5) {
                uncitedClaims.push(this.shortenClaim(claimCandidate));
            }
        }

        const coverage = totalClaims > 0 ? citedClaims / totalClaims : sourceCount > 0 ? 1 : 0;

        return {
            totalClaims,
            citedClaims,
            uncitedClaims,
            sourceCount,
            coverage,
        };
    }

    private normalizeClaimLine(line: string): string {
        if (/^(confidence|level|gaps|scope|total findings|high priority)\s*:/iu.test(line)) {
            return '';
        }

        if (/^[-*+]\s+/u.test(line)) {
            return line.replace(/^[-*+]\s+/u, '').trim();
        }

        if (/^\d+\.\s+/u.test(line)) {
            return line.replace(/^\d+\.\s+/u, '').trim();
        }

        return line;
    }

    private hasCitation(line: string): boolean {
        return WIKI_LINK_REGEX.test(line) || MARKDOWN_LINK_REGEX.test(line);
    }

    private shortenClaim(line: string): string {
        if (line.length <= 120) {
            return line;
        }
        return `${line.slice(0, 117)}...`;
    }
}
