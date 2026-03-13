import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { initNotifications, notify } from "@mycv/f8-notification";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import statisticsManager from "../../utils/statisticsManager";
import modeManager, { WORK_MODES } from "../../utils/modeManager";
import dataManager from "../../utils/dataManager";
import notificationManager from "../../utils/notificationManager";
import useHeatmapWorker from '../../hooks/useHeatmapWorker';
import useMLWorker from '../../hooks/useMLWorker';
import soundURL from "../../assets/alarm.mp3";
import "./HandDetection.css";

const NOT_TOUCH_LABEL = "not_touch";
const TOUCH_LABEL = "touch";
const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;

function HandDetection() {
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const fileInputRef = useRef();
  const soundRef = useRef(new Howl({
    src: [soundURL],
    html5: true,
  }));
  const [touched, setTouched] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState({ label: null, progress: 0 });
  const [cameraError, setCameraError] = useState(null);
  const [customAudioUrl, setCustomAudioUrl] = useState(null);
  const [modelSaveMsg, setModelSaveMsg] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentMode, setCurrentMode] = useState(() => modeManager.getMode());
  const [lastSafeTime, setLastSafeTime] = useState(0);
  const [videoZoom, setVideoZoom] = useState(1);
  const [confidence, setConfidence] = useState({ touch: 0, notTouch: 0 });
  const [touchLog, setTouchLog] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const lastTouchRecordedRef = useRef(0);
  const lastSafeTimeRef = useRef(Date.now());
  const heatCanvasRef = useRef();
  const isRunningRef = useRef(false);
  const cameraStreamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);
  const fpsCountRef = useRef(0);
  const [fps, setFps] = useState(0);

  // ===== Workers & optimisations =====
  const heatmap = useHeatmapWorker(heatCanvasRef);
  const mlWorker = useMLWorker();

  const getCameraErrorMessage = (err) => {
    if (!err) return "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập và kết nối HTTPS.";
    const name = err.name || "";
    if (name === "InsecureContextError") {
      return "Truy cập camera trên điện thoại cần HTTPS. Hãy mở web bằng https:// hoặc localhost.";
    }
    if (name === "NotSupportedError") {
      return "Trình duyệt hiện tại không hỗ trợ truy cập camera (getUserMedia).";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError")
      return "Không tìm thấy camera trên thiết bị này.";
    if (name === "NotAllowedError" || name === "PermissionDeniedError")
      return "Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.";
    if (name === "NotReadableError" || name === "TrackStartError")
      return "Camera đang được sử dụng bởi ứng dụng khác.";
    return "Không thể truy cập camera. Vui lòng kiểm tra lại thiết bị.";
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const audioUrl = URL.createObjectURL(file);
      setCustomAudioUrl(audioUrl);
      soundRef.current.unload();
      soundRef.current = new Howl({
        src: [audioUrl],
        html5: true,
      });
      // Gắn event listener cho instance mới
      soundRef.current.on("end", function () {
        canPlaySound.current = true;
      });
      console.log("Audio uploaded:", file.name, "URL:", audioUrl);
    }
  };

  const resetAudio = () => {
    if (customAudioUrl) {
      URL.revokeObjectURL(customAudioUrl);
      setCustomAudioUrl(null);
      soundRef.current.unload();
      soundRef.current = new Howl({
        src: [soundURL],
        html5: true,
      });
      // Gắn event listener cho instance mới
      soundRef.current.on("end", function () {
        canPlaySound.current = true;
      });
      console.log("Audio reset to default");
    }
  };

  const init = async () => {
    console.log("init...");
    try {
      await setupCamera();
    } catch (err) {
      setCameraError(getCameraErrorMessage(err));
      return;
    }
    console.log("setup camera successfully");

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log("setup done");
    console.log("Không chạm tay lên mạt và bấm train 1");

    initNotifications({ cooldown: 3000 });
  };

  const setupCamera = async () => {
    const host = window.location.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    const isSecure = window.isSecureContext || isLocalHost;

    if (!isSecure) {
      const insecureErr = new Error("Camera requires secure context");
      insecureErr.name = "InsecureContextError";
      throw insecureErr;
    }

    const attachStream = async (stream) => {
      cameraStreamRef.current = stream;
      if (!video.current) return;

      video.current.srcObject = stream;
      video.current.setAttribute("playsinline", "true");
      video.current.muted = true;

      try {
        await video.current.play();
      } catch (playErr) {
        console.warn("Video autoplay blocked:", playErr);
      }
    };

    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      await attachStream(stream);
      return;
    }

    const legacyGetUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    if (!legacyGetUserMedia) {
      const unsupportedErr = new Error("getUserMedia is not supported");
      unsupportedErr.name = "NotSupportedError";
      throw unsupportedErr;
    }

    await new Promise((resolve, reject) => {
      legacyGetUserMedia.call(
        navigator,
        { video: true, audio: false },
        async (stream) => {
          await attachStream(stream);
          resolve();
        },
        reject
      );
    });
  };

  // addHeatPoint / clearHeatmap → delegated to useHeatmapWorker

  const handleSaveModel = async () => {
    if (mlWorker.isReady()) {
      try {
        const workerDataset = await mlWorker.getDataset();
        if (!workerDataset || Object.keys(workerDataset).length === 0) {
          setModelSaveMsg('✗ Chưa có dữ liệu training để lưu.');
        } else {
          dataManager.saveModelFromWorkerData(workerDataset);
          setModelSaveMsg('✓ Đã lưu model');
        }
      } catch (e) {
        setModelSaveMsg('✗ Lỗi: ' + e.message);
      }
    } else {
      // Fallback: main-thread classifier
      const result = dataManager.saveModel(classifier.current);
      setModelSaveMsg(result.success ? '✓ Đã lưu model' : '✗ ' + result.error);
    }
    setTimeout(() => setModelSaveMsg(null), 3000);
  };

  const handleLoadModel = async () => {
    if (mlWorker.isReady()) {
      const rawData = dataManager.loadModelRaw();
      if (!rawData) {
        setModelSaveMsg('✗ Không tìm thấy model đã lưu.');
        setTimeout(() => setModelSaveMsg(null), 3500);
        return;
      }
      try {
        await mlWorker.setDataset(rawData);
        setModelSaveMsg('✓ Đã tải model, nhấn Chạy AI');
      } catch (e) {
        setModelSaveMsg('✗ Lỗi: ' + e.message);
      }
    } else {
      if (!classifier.current) return;
      const result = dataManager.loadModel(classifier.current);
      setModelSaveMsg(result.success ? '✓ Đã tải model, nhấn Chạy AI' : '✗ ' + result.error);
    }
    setTimeout(() => setModelSaveMsg(null), 3500);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
        cameraStreamRef.current = null;
      }
      if (video.current) video.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        await setupCamera();
        setCameraOn(true);
        setCameraError(null);
      } catch (err) {
        setCameraError(getCameraErrorMessage(err));
      }
    }
  };

  const train = async (label) => {
    console.log(`[${label}] Đang train cho máy tính của bạn...`);
    // Bắt đầu session nếu chưa bắt đầu
    if (!sessionActive) {
      statisticsManager.startSession();
      setSessionActive(true);
    }
    for (let i = 0; i < TRAINING_TIMES; i++) {
      const progress = parseInt((i + 1) / TRAINING_TIMES * 100);
      console.log(`Progress ${progress}% `);
      setTrainingStatus({ label, progress });
      await training(label);
    }
    setTrainingStatus({ label: null, progress: 0 });
    // Ghi nhận training thành công
    statisticsManager.recordTrainingSuccess(95);
  };

  /**
   * Bước 1: TRain cho máy khuôn mặt không chạm tay
   * Bước 2: Train cho máy khuôn mặt chạm tay
   * Bước 4: Lấy hình ảnh hiện tại, phân tích và so sánh với data đã học trước đó
   * ===> Nếu matching vs data khuôn mặt chạm tay ===> Cảnh báo
   * @param {*} label
   */

  const training = (label) => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(video.current, true);
      if (mlWorker.isReady()) {
        // KNN trong worker — extract Float32Array rồi dispose tensor ngay
        const data = await embedding.data();
        embedding.dispose();
        mlWorker.addExample(data, label);
      } else {
        // Fallback: main-thread KNN
        classifier.current.addExample(embedding, label);
        embedding.dispose();
      }
      await sleep(100);
      resolve();
    });
  };

  const run = async () => {
    if (!isRunningRef.current) return;
    const embedding = mobilenetModule.current.infer(video.current, true);

    let result;
    if (mlWorker.isReady()) {
      // KNN prediction trong worker (off main thread)
      const data = await embedding.data();
      embedding.dispose();
      try {
        result = await mlWorker.predict(data);
      } catch (e) {
        // Worker chưa có examples → chờ training
        if (isRunningRef.current) run();
        return;
      }
    } else {
      // Fallback: main-thread KNN
      result = await classifier.current.predictClass(embedding);
      embedding.dispose();
    }

    // FPS counter
    fpsCountRef.current += 1;

    console.log("Label: ", result.label);
    console.log("Confidences: ", result.confidences);

    const touchConf = result.confidences[TOUCH_LABEL] || 0;
    const notTouchConf = result.confidences[NOT_TOUCH_LABEL] || 0;
    setConfidence({ touch: touchConf, notTouch: notTouchConf });

    if (
      result.label === TOUCH_LABEL &&
      result.confidences[result.label] > TOUCH_CONFIDENCE
    ) {
      console.log("Touched");
      
      // Xác định có phát âm thanh không dựa trên chế độ
      const shouldPlaySound = currentMode !== WORK_MODES.AMBIENT && 
        !(currentMode === WORK_MODES.STUDY && !modeManager.getModeConfig('study').notifications);
      
      if (shouldPlaySound && canPlaySound.current) {
        canPlaySound.current = false;
        soundRef.current.play();
      }
      
      // Gửi thông báo
      const notificationMsg = currentMode === WORK_MODES.POMODORO 
        ? "🍅 Ngắt Pomodoro! Bạn chạm tay vào mặt"
        : currentMode === WORK_MODES.STUDY 
        ? "📚 Chú ý! Chạm tay khi đang học"
        : "Cảnh báo";
      
      notify(notificationMsg, { body: "Vui lòng không chạm tay vào mạt!" });
      
      // Ghi nhận touch event vào thống kê (chỉ ghi 1 lần mỗi 2 giây)
      const now = Date.now();
      if (now - lastTouchRecordedRef.current > 2000 && sessionActive) {
        statisticsManager.recordTouch(touchConf);
        lastTouchRecordedRef.current = now;
        // Thêm vào touch log
        const entry = {
          id: now,
          time: new Date().toLocaleTimeString('vi-VN'),
          confidence: (touchConf * 100).toFixed(1),
        };
        setTouchLog(prev => [entry, ...prev].slice(0, 50));
        // Vẽ lên heatmap (OffscreenCanvas worker)
        heatmap.addPoint();
      }
      
      // Gửi thông báo desktop + rung
      notificationManager.alert(
        notificationMsg,
        'Vui lòng không chạm tay vào mặt!'
      );
      setTouched(true);
    } else {
      console.log("Not touched");
      setTouched(false);
      // Cập nhật thời gian an toàn
      lastSafeTimeRef.current = Date.now();
      setLastSafeTime(Date.now() - lastSafeTimeRef.current);
    }
    await sleep(200);
    if (isRunningRef.current) run();
  };

  const sleep = (ms = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const formatSafeTime = (ms) => {
    if (ms < 0) return "0s";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  useEffect(() => {
    // Khởi tạo OffscreenCanvas cho heatmap
    heatmap.initCanvas();

    init();
    // Bắt đầu phiên làm việc
    statisticsManager.startSession();
    setSessionActive(true);
    lastSafeTimeRef.current = Date.now();
    
    soundRef.current.on("end", function () {
      canPlaySound.current = true;
    });

    // Áp dụng volume từ notificationManager
    soundRef.current.volume(notificationManager.getVolume());

    // Subscribe đến thay đổi notification settings (volume)
    const unsubscribeNotif = notificationManager.subscribe((settings) => {
      soundRef.current.volume(settings.volume);
    });

    // Subscribe đến thay đổi mode
    const unsubscribeMode = modeManager.subscribe((newModes) => {
      setCurrentMode(newModes.current);
    });

    // Cập nhật thời gian an toàn + FPS mỗi 1 giây
    const safeTimeInterval = setInterval(() => {
      setLastSafeTime(Date.now() - lastSafeTimeRef.current);
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    
    return () => {
      // Dừng vòng lặp run() nếu đang chạy
      isRunningRef.current = false;
      // Dừng camera stream
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      clearInterval(safeTimeInterval);
      unsubscribeMode();
      unsubscribeNotif();
      // Kết thúc phiên làm việc khi unmount (endSession tự kiểm tra nội bộ)
      statisticsManager.endSession();
      if (customAudioUrl) {
        URL.revokeObjectURL(customAudioUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <div className="header">
        <div className="header-top">
          <div>
            <h1>Hand Touch Detection AI</h1>
            <p>Huấn luyện AI để cảnh báo khi bạn chạm tay lên mặt</p>
          </div>
          <div className="mode-indicator">
            {currentMode === WORK_MODES.POMODORO && <span className="mode-badge pomodoro">🍅 Pomodoro</span>}
            {currentMode === WORK_MODES.STUDY && <span className="mode-badge study">📚 Study</span>}
            {currentMode === WORK_MODES.AMBIENT && <span className="mode-badge ambient">🌊 Ambient</span>}
          </div>
        </div>
      </div>

      {cameraError && (
        <div className="camera-error-alert">
          <div className="camera-error-alert__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7 16 12 23 17V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <div className="camera-error-alert__body">
            <p className="camera-error-alert__title">Không thể truy cập camera</p>
            <p className="camera-error-alert__message">{cameraError}</p>
          </div>
        </div>
      )}

      {/* ===== Layout 2 cột: trái (video + confidence) | phải (timer + log) ===== */}
      <div className="detection-layout">

        {/* Cột trái: Video + Confidence bars */}
        <div className="detection-left">
          <div className="video-wrapper" style={{ transform: `scale(${videoZoom})` }}>
            <video ref={video} className="video" autoPlay playsInline muted />
            <canvas
              ref={heatCanvasRef}
              width={480}
              height={360}
              className={`heatmap-canvas ${showHeatmap ? 'visible' : 'hidden'}`}
            />
            <div className={`status-badge ${touched ? 'danger' : 'safe'}`}>
              <span className="status-dot" />
              {touched ? 'Đang chạm mặt!' : 'An toàn'}
            </div>
            {!cameraOn && (
              <div className="video-off-overlay">
                <div className="video-off-overlay__icon">📷</div>
                <div className="video-off-overlay__text">Camera đã tắt</div>
              </div>
            )}
            <div className="video-controls">
              <button
                className={`video-control-btn camera-toggle ${cameraOn ? '' : 'off'}`}
                onClick={toggleCamera}
                title={cameraOn ? 'Tắt camera' : 'Bật camera'}
              >{cameraOn ? '📷' : '🚫'}</button>
              <button className="video-control-btn" onClick={() => setVideoZoom(Math.max(1, videoZoom - 0.1))} title="Thu nhỏ">−</button>
              <span className="video-zoom-level">{(videoZoom * 100).toFixed(0)}%</span>
              <button className="video-control-btn" onClick={() => setVideoZoom(Math.min(2, videoZoom + 0.1))} title="Phóng to">+</button>
              <button
                className={`video-control-btn heatmap-toggle ${showHeatmap ? 'active' : ''}`}
                onClick={() => setShowHeatmap(h => !h)}
                title={showHeatmap ? 'Ẩn heatmap' : 'Hiện heatmap'}
              >🔥</button>
              <button className="video-control-btn" onClick={heatmap.clear} title="Xóa heatmap">✕</button>
            </div>
            {fps > 0 && (
              <div className="fps-badge">{fps} FPS {mlWorker.isReady() ? '⚡' : ''}</div>
            )}
          </div>

          {/* Confidence bars ngay bên dưới video */}
          <div className="confidence-panel">
            <div className="confidence-row">
              <span className="confidence-label touch-label">👋 Chạm tay</span>
              <div className="confidence-bar-wrap">
                <div className="confidence-bar touch-bar" style={{ width: `${(confidence.touch * 100).toFixed(0)}%` }} />
              </div>
              <span className="confidence-pct">{(confidence.touch * 100).toFixed(0)}%</span>
            </div>
            <div className="confidence-row">
              <span className="confidence-label safe-label">✅ Không chạm</span>
              <div className="confidence-bar-wrap">
                <div className="confidence-bar safe-bar" style={{ width: `${(confidence.notTouch * 100).toFixed(0)}%` }} />
              </div>
              <span className="confidence-pct">{(confidence.notTouch * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Safe timer + Touch log */}
        <div className="detection-right">
          <div className="safe-time-display">
            <div className="safe-time-label">⏱ Không chạm</div>
            <div className="safe-time-value">{formatSafeTime(lastSafeTime)}</div>
          </div>

          {touchLog.length > 0 && (
            <div className="touch-log">
              <div className="touch-log__header">
                <span className="touch-log__title">📋 Lịch sử ({touchLog.length})</span>
                <button className="touch-log__clear" onClick={() => setTouchLog([])}>× Xóa</button>
              </div>
              <div className="touch-log__list">
                {touchLog.map(entry => (
                  <div key={entry.id} className="touch-log__item">
                    <span className="touch-log__icon">👋</span>
                    <span className="touch-log__time">{entry.time}</span>
                    <span className="touch-log__conf">Conf: <strong>{entry.confidence}%</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training progress — full width, chỉ hiện khi đang train */}
      {trainingStatus.label && (
        <div className="training-progress">
          <div className="training-progress__header">
            <span className="training-progress__label">
              {trainingStatus.label === NOT_TOUCH_LABEL ? 'Training: Không chạm' : 'Training: Chạm tay'}
            </span>
            <span className="training-progress__percent">{trainingStatus.progress}%</span>
          </div>
          <div className="training-progress__bar">
            <div className="training-progress__fill" style={{ width: `${trainingStatus.progress}%` }} />
          </div>
        </div>
      )}

      {/* ===== Action Toolbar: tất cả nút được nhóm gọn ===== */}
      <div className="action-toolbar">
        <div className="action-group">
          <span className="action-group__label">Huấn luyện</span>
          <div className="action-group__btns">
            <button className="btn btn-train1" onClick={() => train(NOT_TOUCH_LABEL)} disabled={!!trainingStatus.label || !!cameraError}>
              Train 1
            </button>
            <button className="btn btn-train2" onClick={() => train(TOUCH_LABEL)} disabled={!!trainingStatus.label || !!cameraError}>
              Train 2
            </button>
          </div>
        </div>

        <div className="action-divider" />

        <div className="action-group">
          <span className="action-group__label">Phát hiện</span>
          <div className="action-group__btns">
            <button className="btn btn-run" onClick={() => { isRunningRef.current = true; run(); }} disabled={!!trainingStatus.label || !!cameraError}>
              ▶ Chạy AI
            </button>
          </div>
        </div>

        <div className="action-divider" />

        <div className="action-group">
          <span className="action-group__label">Model</span>
          <div className="action-group__btns">
            <button className="btn btn-save-model" onClick={handleSaveModel} disabled={!!cameraError}>
              💾 Lưu
            </button>
            <button className="btn btn-load-model" onClick={handleLoadModel} disabled={!!cameraError}>
              📂 Tải
            </button>
          </div>
          {modelSaveMsg && (
            <span className={`model-save-msg ${modelSaveMsg.startsWith('✓') ? 'success' : 'error'}`}>
              {modelSaveMsg}
            </span>
          )}
        </div>

        <div className="action-divider" />

        <div className="action-group">
          <span className="action-group__label">Âm thanh</span>
          <div className="action-group__btns">
            <label className="audio-label">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                style={{ display: 'none' }}
              />
              <span className="btn btn-audio">🎵 Tải lên</span>
            </label>
            {customAudioUrl && (
              <button className="btn btn-reset" onClick={resetAudio}>↩ Reset</button>
            )}
          </div>
          {customAudioUrl && <span className="audio-selected">✓ Âm thanh tùy chỉnh</span>}
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <div className="step"><span className="step-num">1</span> Mặt thẳng → Train 1</div>
        <div className="step"><span className="step-num">2</span> Chạm tay → Train 2</div>
        <div className="step"><span className="step-num">3</span> ▶ Chạy AI</div>
      </div>
    </div>
  );
}

export default HandDetection;
