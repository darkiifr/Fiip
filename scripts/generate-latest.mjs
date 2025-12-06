
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const tauriDir = path.join(projectRoot, 'src-tauri');
const targetDir = path.join(tauriDir, 'target/release/bundle/nsis');

// Read tauri.conf.json for version (Source of Truth for the binary)
const tauriConfig = JSON.parse(fs.readFileSync(path.join(tauriDir, 'tauri.conf.json'), 'utf-8'));
const version = tauriConfig.version;

// Validate version format (SemVer)
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Error: Version "${version}" is not a valid SemVer (expected X.Y.Z)`);
    process.exit(1);
}

console.log(`Generating latest.json for version ${version}...`);

try {
    // Find the .exe (installer) file
    const files = fs.readdirSync(targetDir);
    const exeFile = files.find(f => f.endsWith('.exe') && f.includes(version));
    const sigFile = exeFile ? files.find(f => f === `${exeFile}.sig`) : null;

    if (!exeFile) {
        console.error('Error: Could not find .exe file in ' + targetDir);
        console.warn('Available files:', files);
        console.error('Make sure you ran "npm run tauri build" successfully.');
        process.exit(1);
    }

    let signature = '';
    if (sigFile) {
        signature = fs.readFileSync(path.join(targetDir, sigFile), 'utf-8');
    } else {
        console.log('ℹ️  No .sig file found. Attempting to sign manually...');
        
        // Try to find keys in environment variables (support both v1 and v2 naming)
        const privateKey = process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_PRIVATE_KEY;
        const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || process.env.TAURI_PRIVATE_KEY_PASSWORD;

        if (privateKey && password) {
            try {
                const exePath = path.join(targetDir, exeFile);
                console.log(`   Signing ${exeFile}...`);
                
                // Run tauri signer sign
                // We pass keys via env vars TAURI_PRIVATE_KEY/PASSWORD which the CLI expects
                execSync(`npx tauri signer sign "${exePath}"`, {
                    env: {
                        ...process.env,
                        TAURI_PRIVATE_KEY: privateKey,
                        TAURI_PRIVATE_KEY_PASSWORD: password
                    },
                    stdio: 'inherit'
                });

                // Check if .sig file was created
                const newSigFile = `${exeFile}.sig`;
                const newSigPath = path.join(targetDir, newSigFile);
                
                if (fs.existsSync(newSigPath)) {
                    signature = fs.readFileSync(newSigPath, 'utf-8');
                    console.log('✅ Successfully signed the binary manually.');
                } else {
                    throw new Error('Signer command finished but .sig file is missing.');
                }
            } catch (err) {
                console.error('⚠️  Manual signing failed:', err.message);
                console.log('   Falling back to SHA256 hash.');
                const fileBuffer = fs.readFileSync(path.join(targetDir, exeFile));
                const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                signature = hash;
                console.log(`   Hash: ${hash}`);
            }
        } else {
            console.log('ℹ️  Private key not found in environment. Generating SHA256 hash as fallback signature.');
            const fileBuffer = fs.readFileSync(path.join(targetDir, exeFile));
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            signature = hash;
            console.log(`   Hash: ${hash}`);
        }
    }

    const pubDate = new Date().toISOString();

    const updateData = {
        version: version,
        notes: `Update to version ${version}`,
        pub_date: pubDate,
        platforms: {
            "windows-x86_64": {
                "signature": signature,
                "url": `https://github.com/darkiifr/Fiip/releases/latest/download/${exeFile}`
            }
        }
    };

    const outputPath = path.join(projectRoot, 'latest.json');
    fs.writeFileSync(outputPath, JSON.stringify(updateData, null, 2));

    console.log(`Success! generated latest.json at ${outputPath}`);
    console.log(`\nNext steps:`);
    console.log(`1. Upload ${path.join(targetDir, exeFile)} to GitHub Releases`);
    console.log(`2. Upload ${outputPath} to GitHub Releases`);

} catch (e) {
    console.error('Error generating latest.json:', e);
    process.exit(1);
}
