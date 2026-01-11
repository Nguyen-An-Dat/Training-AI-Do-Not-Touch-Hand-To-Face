import React, { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { initNotifications, notify } from "@mycv/f8-notification";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import soundURL from "./assets/alarm.mp3";
import "./App.css";

var sound = new Howl({
  src: [soundURL],
});

const NOT_TOUCH_LABEL = "not_touch";
const TOUCH_LABEL = "touch";
const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const [touched, setTouched] = useState(false);

  const init = async () => {
    console.log("init...");
    await setupCamera();
    console.log("setup camera successfully");

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log("setup done");
    console.log("Không chạm tay lên mạt và bấm train 1");

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
    console.log(`[${label}] Đang train cho máy tính của bạn...`);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}% `);

      await training(label);
    }
  };

  /**
   * Bước 1: TRain cho máy khuôn mặt không chạm tay
   * Bước 2: Train cho máy khuôn mặt chạm tay
   * Bước 4: Lấy hình ảnh hiện tại, phân tích và so sánh với data đã học trước đó
   * ===> Nếu matching vs data khuôn mặt chạm tay ===> Cảnh báo
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
      notify("Cảnh báo", { body: "Vui lòng không chạm tay vào mạt!" });
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
  // useEffect(() => {
  //   init();
  //   return () => {}
  // }, [])
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
      <video ref={video} className="video" autoPlay />
      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>
          Train 1
        </button>
        <button className="btn" onClick={() => train(TOUCH_LABEL)}>
          Train 2
        </button>
        <button className="btn" onClick={() => run()}>
          Run
        </button>
      </div>
    </div>
  );
}

export default App;
