import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { initNotifications, notify } from "@mycv/f8-notification";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import soundURL from "../../assets/alarm.mp3";
import "./HandDetection.css";

var sound = new Howl({
  src: [soundURL],
});

const NOT_TOUCH_LABEL = "not_touch";
const TOUCH_LABEL = "touch";
const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;

function HandDetection() {
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState({ label: null, progress: 0 });

  const init = async () => {
    console.log("init...");
    await setupCamera();
    console.log("setup camera successfully");

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log("setup done");
    console.log("Không chạm tay lên mạt và bấm train 1");

    initNotifications({ cooldown: 3000 });
  };

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", resolve);
          },
          (err) => reject(err)
        );
      } else {
        reject();
      }
    });
  };

  const train = async (label) => {
    console.log(`[${label}] Đang train cho máy tính của bạn...`);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      const progress = parseInt((i + 1) / TRAINING_TIMES * 100);
      console.log(`Progress ${progress}% `);
      setTrainingStatus({ label, progress });
      await training(label);
    }
    setTrainingStatus({ label: null, progress: 0 });
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
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  };

  const run = async () => {
    const embedding = mobilenetModule.current.infer(video.current, true);
    const result = await classifier.current.predictClass(embedding);
    console.log("Label: ", result.label);
    console.log("Confidences: ", result.confidences);
    if (
      result.label === TOUCH_LABEL &&
      result.confidences[result.label] > TOUCH_CONFIDENCE
    ) {
      console.log("Touched");
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify("Cảnh báo", { body: "Vui lòng không chạm tay vào mạt!" });
      setTouched(true);
    } else {
      console.log("Not touched");
      setTouched(false);
    }
    await sleep(200);
    run();
  };

  const sleep = (ms = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  useEffect(() => {
    init();
    sound.on("end", function () {
      canPlaySound.current = true;
    });
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <div className="header">
        <h1>Hand Touch Detection AI</h1>
        <p>Huấn luyện AI để cảnh báo khi bạn chạm tay lên mặt</p>
      </div>

      <div className="video-wrapper">
        <video ref={video} className="video" autoPlay />
        <div className={`status-badge ${touched ? 'danger' : 'safe'}`}>
          <span className="status-dot" />
          {touched ? 'Đang chạm mặt!' : 'An toàn'}
        </div>
      </div>

      <div className="control">
        <button className="btn btn-train1" onClick={() => train(NOT_TOUCH_LABEL)} disabled={!!trainingStatus.label}>
          Train 1 — Không chạm
        </button>
        <button className="btn btn-train2" onClick={() => train(TOUCH_LABEL)} disabled={!!trainingStatus.label}>
          Train 2 — Chạm tay
        </button>
        <button className="btn btn-run" onClick={() => run()} disabled={!!trainingStatus.label}>
          Chạy AI
        </button>
      </div>

      {trainingStatus.label && (
        <div className="training-progress">
          <div className="training-progress__header">
            <span className="training-progress__label">
              {trainingStatus.label === NOT_TOUCH_LABEL ? 'Training: Không chạm' : 'Training: Chạm tay'}
            </span>
            <span className="training-progress__percent">{trainingStatus.progress}%</span>
          </div>
          <div className="training-progress__bar">
            <div
              className="training-progress__fill"
              style={{ width: `${trainingStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="instructions">
        <div className="step">
          <span className="step-num">1</span>
          Giữ thẳng mặt &rarr; Train 1
        </div>
        <div className="step">
          <span className="step-num">2</span>
          Chạm tay vào mặt &rarr; Train 2
        </div>
        <div className="step">
          <span className="step-num">3</span>
          Nhấn Chạy AI để bắt đầu
        </div>
      </div>
    </div>
  );
}

export default HandDetection;
