const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'D:/kami';
const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', 'build', '.pytest_cache', 'LeafCure-main']);

const SECRET_PATTERNS = [
    { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: 'CRITICAL' },
    { name: 'AWS Secret Access Key', regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi, severity: 'CRITICAL' },
    { name: 'MongoDB Connection String with Password', regex: /mongodb(?:\+srv)?:\/\/[^:]+:([^@]+)@/gi, severity: 'HIGH' },
    { name: 'Hardcoded JWT Secret Assignment', regex: /(?:JWT_SECRET|jwtSecret)\s*[:=]\s*["']([^"']{6,})["']/gi, severity: 'HIGH' },
    { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, severity: 'CRITICAL' },
    { name: 'Generic API Key / Secret String', regex: /(?:api[_-]?key|secret[_-]?key)\s*[:=]\s*["']([A-Za-z0-9_\-]{20,})["']/gi, severity: 'MEDIUM' }
];

const findings = [];

function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        SECRET_PATTERNS.forEach(pat => {
            let match;
            const regex = new RegExp(pat.regex);
            lines.forEach((line, lineNum) => {
                // Ignore test fixtures, mocks, sample envs, and benchmark scripts
                if (filePath.includes('.test.js') || filePath.includes('.env.example') || filePath.includes('mock') || filePath.includes('security_secret_scanner.js')) {
                    return;
                }
                while ((match = regex.exec(line)) !== null) {
                    // Mask the secret for safe logging
                    const matchedStr = match[0];
                    const masked = matchedStr.length > 12 ? matchedStr.slice(0, 4) + '****' + matchedStr.slice(-4) : '****';
                    findings.push({
                        pattern: pat.name,
                        severity: pat.severity,
                        file: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
                        line: lineNum + 1,
                        snippet: masked
                    });
                }
            });
        });
    } catch {
        // Skip unreadable files
    }
}

function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        if (EXCLUDE_DIRS.has(ent.name)) continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            traverse(full);
        } else if (ent.isFile() && /\.(js|ts|tsx|json|env|sh|ps1)$/.test(ent.name)) {
            scanFile(full);
        }
    }
}

console.log('Scanning codebase for exposed secrets...');
traverse(ROOT_DIR);
console.log(`Scan completed. Found ${findings.length} potential secrets.`);

const resultsPath = path.resolve('D:/kami/docs/testing/raw-results/secret_scan_results.json');
fs.writeFileSync(resultsPath, JSON.stringify(findings, null, 2), 'utf8');
console.log(`Saved secret scan findings to ${resultsPath}`);
findings.forEach(f => console.log(`[${f.severity}] ${f.pattern} in ${f.file}:${f.line} -> ${f.snippet}`));
