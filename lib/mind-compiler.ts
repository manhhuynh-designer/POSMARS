/**
 * MindAR Compiler Interface
 * Uses local MindAR 1.2.5 build (ES Module) from public/libs/mindar/
 */

const COMPILER_URL = '/libs/mindar/mindar-image.prod.js';

interface MindARCompiler {
    compileImageTargets: (images: HTMLImageElement[], onProgress: (progress: number) => void) => Promise<any>;
    exportData: () => Promise<Uint8Array>;
}

declare global {
    interface Window {
        MINDAR: {
            IMAGE: {
                Compiler: new () => MindARCompiler;
            }
        };
    }
}

let compilerLoaded = false;

export const compileFiles = async (files: File[], onProgress: (progress: number) => void): Promise<Blob> => {
    // 1. Load Script if needed
    await loadCompilerScript();

    // 2. Load Files into HTMLImageElements
    const images = await Promise.all(files.map(loadImage));

    // 3. Initialize Compiler
    console.log('[MindAR] Creating compiler instance (v1.2.5)...');
    // Note: V1.2.5 uses MINDAR.IMAGE.Compiler
    const compiler = new window.MINDAR.IMAGE.Compiler();

    // 4. Compile
    console.log(`[MindAR] Starting compilation of ${images.length} images...`);
    const data = await compiler.compileImageTargets(images, (progress) => {
        // MindAR 1.2.5 usually returns 0-100, but we clamp just in case
        const clampedProgress = Math.min(100, Math.max(0, progress));
        console.log(`[MindAR] Progress: ${progress.toFixed(1)}%`);
        onProgress(clampedProgress);
    });

    // 5. Export
    console.log('[MindAR] Compilation complete. Exporting data...');
    const buffer = await compiler.exportData();
    return new Blob([buffer as any]);
};

const loadCompilerScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Already loaded
        if (compilerLoaded && window.MINDAR?.IMAGE?.Compiler) {
            console.log('[MindAR] Compiler already loaded.');
            resolve();
            return;
        }

        // Check if already exists (from previous load)
        if (window.MINDAR?.IMAGE?.Compiler) {
            compilerLoaded = true;
            console.log('[MindAR] Compiler found in window.');
            resolve();
            return;
        }

        console.log('[MindAR] Loading compiler script from:', COMPILER_URL);
        const script = document.createElement('script');
        script.type = 'module'; // Crucial for v1.2.5
        script.src = COMPILER_URL;

        script.onload = () => {
            // Module scripts might take a tick to execute
            setTimeout(() => {
                if (window.MINDAR?.IMAGE?.Compiler) {
                    compilerLoaded = true;
                    console.log('[MindAR] Compiler script loaded successfully.');
                    resolve();
                } else {
                    console.error('[MindAR] Script loaded but window.MINDAR.IMAGE.Compiler not found.');
                    reject(new Error('MindAR Compiler not exposed after script load'));
                }
            }, 100);
        };

        script.onerror = (e) => {
            console.error('[MindAR] Failed to load compiler script:', e);
            reject(new Error('Failed to load MindAR Compiler script'));
        };

        document.head.appendChild(script);
    });
};

const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};
