/**
 * Default Code Templates for AR Types
 * Used when user switches to Code Mode for the first time
 */

export const DEFAULT_TEMPLATES = {
    image_tracking: {
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>AR Experience</title>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
    <style>
        body { margin: 0; overflow: hidden; }
        .loading-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.8);
            display: flex; align-items: center; justify-content: center;
            color: white; font-family: sans-serif; z-index: 1000;
        }
        .loading-overlay.hidden { display: none; }
        .scan-hint {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.7); color: white; padding: 12px 24px;
            border-radius: 24px; font-family: sans-serif; font-size: 14px;
        }
        .record-btn {
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: #ef4444; color: white; border: none;
            padding: 12px 24px; border-radius: 24px;
            font-size: 14px; font-weight: bold; cursor: pointer; z-index: 100;
            display: none; align-items: center; justify-content: center; gap: 8px;
            box-shadow: 0 4px 15px rgba(239,68,68,0.4);
        }
        .record-btn.recording { animation: pulse 1.5s infinite; background: #b91c1c; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading" class="loading-overlay">
        <div style="text-align: center;">
            <div style="width: 50px; height: 50px; border: 3px solid #333; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 16px;">Đang tải AR...</p>
        </div>
    </div>
    
    <a-scene 
        mindar-image="imageTargetSrc: {{marker_url}}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no"
        color-space="sRGB"
        renderer="colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        loading-screen="enabled: false">
        
        <a-assets timeout="30000">
            <a-asset-item id="model" src="{{asset_url}}"></a-asset-item>
        </a-assets>
        
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        
        <a-entity mindar-image-target="targetIndex: 0">
            <a-gltf-model 
                src="#model" 
                scale="{{model_scale}} {{model_scale}} {{model_scale}}" 
                position="{{model_position_x}} {{model_position_y}} {{model_position_z}}"
                rotation="{{model_rotation_x}} {{model_rotation_y}} {{model_rotation_z}}"
                animation="property: rotation; to: 0 360 0; dur: 10000; easing: linear; loop: true">
            </a-gltf-model>
        </a-entity>
    </a-scene>
    
    <div class="scan-hint">📱 Hướng camera vào poster để xem AR</div>
    <button id="recordBtn" class="record-btn">🔴 Quay video</button>
    
    <script>
        const scene = document.querySelector('a-scene');
        const loading = document.getElementById('loading');
        const recordBtn = document.getElementById('recordBtn');
        const target = document.querySelector('[mindar-image-target]');
        
        scene.addEventListener('arReady', () => {
            loading.classList.add('hidden');
        });
        
        target.addEventListener('targetFound', () => {
            recordBtn.style.display = 'flex';
        });
        
        target.addEventListener('targetLost', () => {
            if (!isRecording) recordBtn.style.display = 'none';
        });

        let mediaRecorder;
        let chunks = [];
        let isRecording = false;
        let timerInterval;

        recordBtn.addEventListener('click', () => {
            if (!isRecording) startRecording();
            else stopRecording();
        });

        async function startRecording() {
            const video = document.querySelector('video');
            const canvas = scene.canvas;
            const composite = document.createElement('canvas');
            composite.width = video.videoWidth;
            composite.height = video.videoHeight;
            const ctx = composite.getContext('2d');

            function draw() {
                if (!isRecording) return;
                ctx.drawImage(video, 0, 0);
                ctx.drawImage(canvas, 0, 0, composite.width, composite.height);
                requestAnimationFrame(draw);
            }

            isRecording = true;
            draw();

            const stream = composite.captureStream(30);
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? 'video/webm;codecs=vp9' 
                : 'video/mp4';
            
            mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ar-video-' + Date.now() + (mimeType.includes('webm') ? '.webm' : '.mp4');
                a.click();
                chunks = [];
            };

            mediaRecorder.start();
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '⬛ Dừng';
            
            let startTime = Date.now();
            timerInterval = setInterval(() => {
                if (Math.floor((Date.now() - startTime) / 1000) >= 30) stopRecording();
            }, 1000);
        }

        function stopRecording() {
            isRecording = false;
            mediaRecorder.stop();
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '🔴 Quay video';
            clearInterval(timerInterval);
        }
    </script>
</body>
</html>`,
        script: '',
        variables: {
            model_scale: '1',
            model_position_x: '0',
            model_position_y: '0',
            model_position_z: '0',
            model_rotation_x: '0',
            model_rotation_y: '0',
            model_rotation_z: '0'
        }
    },

    face_filter: {
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Face Filter</title>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-face-aframe.prod.js"></script>
    <style>
        body { margin: 0; overflow: hidden; }
        .loading-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.9);
            display: flex; align-items: center; justify-content: center;
            color: white; font-family: sans-serif; z-index: 1000;
        }
        .loading-overlay.hidden { display: none; }
        .controls {
            position: fixed; bottom: 80px; left: 0; right: 0;
            display: flex; justify-content: center; gap: 20px; z-index: 100;
        }
        .btn {
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            color: white; border: none; padding: 16px 32px; border-radius: 50px;
            font-size: 16px; font-weight: bold; cursor: pointer;
            box-shadow: 0 4px 15px rgba(236,72,153,0.4);
        }
        .btn:active { transform: scale(0.95); }
        .btn-record { background: #ef4444; box-shadow: 0 4px 15px rgba(239,68,68,0.4); }
        .btn-record.recording { animation: pulse 1.5s infinite; background: #b91c1c; }
        .hint {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            text-align: center; color: white; font-family: sans-serif;
            pointer-events: none; z-index: 50;
        }
        .hint.hidden { display: none; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading" class="loading-overlay">
        <div style="text-align: center;">
            <div style="width: 50px; height: 50px; border: 3px solid #333; border-top-color: #ec4899; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 16px;">Đang khởi động Face Filter...</p>
        </div>
    </div>

    <a-scene
        mindar-face="autoStart: true; uiLoading: no; uiError: no; uiScanning: no"
        color-space="sRGB"
        renderer="colorManagement: true; physicallyCorrectLights: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        loading-screen="enabled: false">
        
        <a-assets timeout="30000">
            <a-asset-item id="filter" src="{{filter_url}}"></a-asset-item>
        </a-assets>
        
        <a-camera active="false" position="0 0 0"></a-camera>
        
        <a-entity mindar-face-target="anchorIndex: {{anchor_index}}">
            <a-gltf-model 
                src="#filter" 
                scale="{{filter_scale}} {{filter_scale}} {{filter_scale}}"
                position="{{offset_x}} {{offset_y}} {{offset_z}}"
                rotation="0 0 0">
            </a-gltf-model>
        </a-entity>
    </a-scene>
    
    <div id="hint" class="hint">
        <p style="font-size: 48px; margin: 0;">✨</p>
        <p>Hướng camera vào khuôn mặt</p>
    </div>
    
    <div id="controls" class="controls" style="display: none;">
        <button id="captureBtn" class="btn">📸 Chụp</button>
        <button id="recordBtn" class="btn btn-record">🔴 Quay</button>
    </div>
    
    <script>
        const scene = document.querySelector('a-scene');
        const loading = document.getElementById('loading');
        const hint = document.getElementById('hint');
        const controls = document.getElementById('controls');
        const captureBtn = document.getElementById('captureBtn');
        const recordBtn = document.getElementById('recordBtn');
        const faceAnchor = document.querySelector('[mindar-face-target]');
        
        scene.addEventListener('arReady', () => {
            loading.classList.add('hidden');
        });
        
        faceAnchor.addEventListener('targetFound', () => {
            hint.classList.add('hidden');
            controls.style.display = 'flex';
        });
        
        faceAnchor.addEventListener('targetLost', () => {
            hint.classList.remove('hidden');
            if (!isRecording) controls.style.display = 'none';
        });
        
        captureBtn.addEventListener('click', async () => {
            const video = document.querySelector('video');
            const canvas = scene.canvas;
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = video.videoWidth;
            captureCanvas.height = video.videoHeight;
            const ctx = captureCanvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            ctx.drawImage(canvas, 0, 0, captureCanvas.width, captureCanvas.height);
            const imageData = captureCanvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.download = 'capture-' + Date.now() + '.jpg';
            link.href = imageData;
            link.click();
        });

        let mediaRecorder;
        let chunks = [];
        let isRecording = false;
        let timerInterval;

        recordBtn.addEventListener('click', () => {
            if (!isRecording) startRecording();
            else stopRecording();
        });

        async function startRecording() {
            const video = document.querySelector('video');
            const canvas = scene.canvas;
            const composite = document.createElement('canvas');
            composite.width = video.videoWidth;
            composite.height = video.videoHeight;
            const ctx = composite.getContext('2d');

            function draw() {
                if (!isRecording) return;
                ctx.drawImage(video, 0, 0);
                ctx.drawImage(canvas, 0, 0, composite.width, composite.height);
                requestAnimationFrame(draw);
            }

            isRecording = true;
            draw();

            const stream = composite.captureStream(30);
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? 'video/webm;codecs=vp9' 
                : 'video/mp4';
            
            mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'video-' + Date.now() + (mimeType.includes('webm') ? '.webm' : '.mp4');
                a.click();
                chunks = [];
            };

            mediaRecorder.start();
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '⬛ Dừng';
            
            let startTime = Date.now();
            timerInterval = setInterval(() => {
                if (Math.floor((Date.now() - startTime) / 1000) >= 30) stopRecording();
            }, 1000);
        }

        function stopRecording() {
            isRecording = false;
            mediaRecorder.stop();
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '🔴 Quay';
            clearInterval(timerInterval);
        }
    </script>
</body>
</html>`,
        script: '',
        variables: {
            anchor_index: '168',
            filter_scale: '1',
            offset_x: '0',
            offset_y: '0',
            offset_z: '0'
        }
    },

    ar_checkin: {
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>AR Check-in</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #000; 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            overflow: hidden;
        }
        #camera-container {
            position: fixed; inset: 0;
            display: flex; align-items: center; justify-content: center;
        }
        #video {
            width: 100%; height: 100%; object-fit: cover;
        }
        #frame-overlay {
            position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            pointer-events: none;
        }
        #frame-overlay img {
            max-width: 100%; max-height: 100%; object-fit: contain;
        }
        .controls {
            position: fixed; bottom: 0; left: 0; right: 0;
            padding: 24px; display: flex; justify-content: center; gap: 16px;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
        }
        .btn {
            width: 64px; height: 64px; border-radius: 50%;
            border: none; cursor: pointer; display: flex;
            align-items: center; justify-content: center;
            font-size: 24px; transition: transform 0.2s;
        }
        .btn:active { transform: scale(0.9); }
        .capture-btn {
            width: 72px; height: 72px;
            background: white; border: 4px solid rgba(255,255,255,0.3);
        }
        .flip-btn { background: rgba(255,255,255,0.2); }
        
        #preview-container {
            position: fixed; inset: 0; background: rgba(0,0,0,0.95);
            display: none; flex-direction: column; align-items: center;
            justify-content: center; padding: 24px; z-index: 100;
        }
        #preview-container.active { display: flex; }
        #preview-image {
            max-width: 100%; max-height: 60vh; border-radius: 12px;
        }
        .preview-actions {
            display: flex; gap: 16px; margin-top: 24px;
        }
        .action-btn {
            background: linear-gradient(135deg, #f97316, #ef4444);
            color: white; border: none; padding: 14px 28px;
            border-radius: 50px; font-size: 16px; font-weight: 600;
            cursor: pointer;
        }
        .action-btn.secondary {
            background: rgba(255,255,255,0.1);
        }
    </style>
</head>
<body>
    <div id="camera-container">
        <video id="video" autoplay playsinline></video>
        <div id="frame-overlay">
            <img src="{{frame_url}}" alt="Frame">
        </div>
    </div>
    
    <div class="controls">
        <button class="btn flip-btn" id="flipBtn">🔄</button>
        <button class="btn capture-btn" id="captureBtn">📷</button>
    </div>
    
    <div id="preview-container">
        <img id="preview-image" src="" alt="Preview">
        <div class="preview-actions">
            <button class="action-btn secondary" id="retakeBtn">Chụp lại</button>
            <button class="action-btn" id="downloadBtn">Tải về</button>
            <button class="action-btn" id="shareBtn">Chia sẻ</button>
        </div>
    </div>
    
    <script>
        const video = document.getElementById('video');
        const frameImg = document.querySelector('#frame-overlay img');
        const captureBtn = document.getElementById('captureBtn');
        const flipBtn = document.getElementById('flipBtn');
        const previewContainer = document.getElementById('preview-container');
        const previewImage = document.getElementById('preview-image');
        const retakeBtn = document.getElementById('retakeBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const shareBtn = document.getElementById('shareBtn');
        
        let facingMode = 'user';
        let capturedImage = null;
        
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false
                });
                video.srcObject = stream;
            } catch (err) {
                alert('Không thể truy cập camera');
            }
        }
        
        flipBtn.addEventListener('click', () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            video.srcObject?.getTracks().forEach(t => t.stop());
            startCamera();
        });
        
        captureBtn.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Flip for selfie camera
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            if (facingMode === 'user') {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            
            // Draw frame
            const frameAspect = frameImg.naturalWidth / frameImg.naturalHeight;
            const canvasAspect = canvas.width / canvas.height;
            let fw, fh, fx, fy;
            if (frameAspect > canvasAspect) {
                fw = canvas.width; fh = fw / frameAspect;
                fx = 0; fy = (canvas.height - fh) / 2;
            } else {
                fh = canvas.height; fw = fh * frameAspect;
                fy = 0; fx = (canvas.width - fw) / 2;
            }
            ctx.drawImage(frameImg, fx, fy, fw, fh);
            
            capturedImage = canvas.toDataURL('image/jpeg', 0.95);
            previewImage.src = capturedImage;
            previewContainer.classList.add('active');
        });
        
        retakeBtn.addEventListener('click', () => {
            previewContainer.classList.remove('active');
        });
        
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'ar-checkin-' + Date.now() + '.jpg';
            link.href = capturedImage;
            link.click();
        });
        
        shareBtn.addEventListener('click', async () => {
            if (navigator.share) {
                const blob = await (await fetch(capturedImage)).blob();
                const file = new File([blob], 'ar-checkin.jpg', { type: 'image/jpeg' });
                await navigator.share({ files: [file], title: 'AR Check-in' });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link đã được sao chép!');
            }
        });
        
        startCamera();
    </script>
</body>
</html>`,
        script: '',
        variables: {}
    },

    lucky_draw: {
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Lucky Draw</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh; display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding: 24px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .logo { max-width: 120px; margin-bottom: 24px; }
        .wheel-container {
            position: relative; width: 300px; height: 300px; margin: 24px 0;
        }
        .wheel {
            width: 100%; height: 100%; border-radius: 50%;
            border: 4px solid rgba(255,255,255,0.2);
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        .pointer {
            position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
            width: 0; height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 30px solid #ef4444;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .spin-btn {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 60px; height: 60px; border-radius: 50%;
            background: white; border: 4px solid #f97316;
            font-weight: bold; color: #f97316; cursor: pointer;
            font-size: 14px; box-shadow: 0 0 20px rgba(249,115,22,0.5);
        }
        .spin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .result-modal {
            position: fixed; inset: 0; background: rgba(0,0,0,0.7);
            display: none; align-items: center; justify-content: center;
            padding: 24px; z-index: 100;
        }
        .result-modal.active { display: flex; }
        .result-card {
            background: white; border-radius: 24px; padding: 32px;
            text-align: center; max-width: 320px; width: 100%;
            animation: pop 0.3s ease-out;
        }
        .result-emoji { font-size: 64px; margin-bottom: 16px; }
        .result-title { font-size: 20px; color: #374151; margin-bottom: 8px; }
        .result-prize {
            font-size: 28px; font-weight: bold;
            background: linear-gradient(135deg, #f97316, #ef4444);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin-bottom: 24px;
        }
        .close-btn {
            background: linear-gradient(135deg, #f97316, #ef4444);
            color: white; border: none; padding: 14px 32px;
            border-radius: 50px; font-size: 16px; font-weight: 600;
            cursor: pointer; width: 100%;
        }
        @keyframes pop { from { transform: scale(0.8); opacity: 0; } }
    </style>
</head>
<body>
    <img class="logo" src="{{logo_url}}" alt="Logo" onerror="this.style.display='none'">
    
    <h1 style="color: white; font-size: 24px; margin-bottom: 8px;">🎰 Vòng quay may mắn</h1>
    <p style="color: rgba(255,255,255,0.6); font-size: 14px;">Quay để nhận quà ngay!</p>
    
    <div class="wheel-container">
        <div class="pointer"></div>
        <canvas id="wheel" class="wheel" width="300" height="300"></canvas>
        <button id="spinBtn" class="spin-btn">QUAY</button>
    </div>
    
    <div id="resultModal" class="result-modal">
        <div class="result-card">
            <div class="result-emoji">🎁</div>
            <div class="result-title">Chúc mừng bạn!</div>
            <div id="resultPrize" class="result-prize"></div>
            <button id="closeBtn" class="close-btn">Nhận quà</button>
        </div>
    </div>
    
    <script>
        // Prize configuration - customize these
        const prizes = {{prizes_json}};
        
        const canvas = document.getElementById('wheel');
        const ctx = canvas.getContext('2d');
        const spinBtn = document.getElementById('spinBtn');
        const resultModal = document.getElementById('resultModal');
        const resultPrize = document.getElementById('resultPrize');
        const closeBtn = document.getElementById('closeBtn');
        
        let spinning = false;
        let rotation = 0;
        
        // Draw wheel
        function drawWheel() {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = canvas.width / 2 - 5;
            const segmentAngle = (2 * Math.PI) / prizes.length;
            
            prizes.forEach((prize, i) => {
                const startAngle = i * segmentAngle - Math.PI / 2;
                const endAngle = startAngle + segmentAngle;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = prize.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.stroke();
                
                // Text
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(startAngle + segmentAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(prize.name.slice(0, 12), radius - 15, 4);
                ctx.restore();
            });
        }
        
        function spin() {
            if (spinning) return;
            spinning = true;
            spinBtn.disabled = true;
            
            // Determine winner
            const random = Math.random() * 100;
            let cumulative = 0;
            let winnerIndex = 0;
            for (let i = 0; i < prizes.length; i++) {
                cumulative += prizes[i].probability;
                if (random <= cumulative) { winnerIndex = i; break; }
            }
            
            const segmentAngle = 360 / prizes.length;
            const targetAngle = 360 - (winnerIndex * segmentAngle + segmentAngle / 2);
            const spins = 5 + Math.floor(Math.random() * 3);
            rotation += spins * 360 + targetAngle - (rotation % 360);
            
            canvas.style.transform = 'rotate(' + rotation + 'deg)';
            
            setTimeout(() => {
                spinning = false;
                spinBtn.disabled = false;
                resultPrize.textContent = prizes[winnerIndex].name;
                resultModal.classList.add('active');
            }, 4000);
        }
        
        spinBtn.addEventListener('click', spin);
        closeBtn.addEventListener('click', () => {
            resultModal.classList.remove('active');
        });
        
        drawWheel();
    </script>
</body>
</html>`,
        script: '',
        variables: {
            prizes_json: JSON.stringify([
                { name: 'Giải nhất', probability: 5, color: '#ef4444' },
                { name: 'Giải nhì', probability: 10, color: '#f97316' },
                { name: 'Giải ba', probability: 15, color: '#eab308' },
                { name: 'Quà tặng', probability: 30, color: '#22c55e' },
                { name: 'Chúc may mắn', probability: 40, color: '#3b82f6' }
            ])
        }
    }
}

/**
 * Get default template for a given AR type
 */
export function getDefaultTemplate(templateType: string): { html: string; script: string } | null {
    const template = DEFAULT_TEMPLATES[templateType as keyof typeof DEFAULT_TEMPLATES]
    if (!template) return null
    return { html: template.html, script: template.script }
}

/**
 * Get default variables for a template type
 */
export function getDefaultVariables(templateType: string): Record<string, string> {
    const template = DEFAULT_TEMPLATES[templateType as keyof typeof DEFAULT_TEMPLATES]
    return template?.variables || {}
}
