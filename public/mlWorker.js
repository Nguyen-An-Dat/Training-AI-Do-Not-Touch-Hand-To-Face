/**
 * mlWorker.js — KNN Classifier trong Web Worker riêng
 * Tải TensorFlow.js + KNN Classifier từ CDN via importScripts
 * Nhận embeddings (Float32Array) từ main thread, chạy KNN prediction off main thread
 */

/* eslint-disable no-undef */
try {
  importScripts(
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
    'https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier@1.2.6/dist/knn-classifier.min.js'
  );
} catch (e) {
  postMessage({ type: 'error', message: 'Failed to load TF.js: ' + e.message });
}

let classifier = null;

function init() {
  try {
    classifier = knn.create();
    postMessage({ type: 'ready' });
  } catch (e) {
    postMessage({ type: 'error', message: 'KNN init failed: ' + e.message });
  }
}

self.addEventListener('message', async ({ data: msg }) => {
  switch (msg.type) {
    case 'init':
      init();
      break;

    case 'addExample': {
      if (!classifier) return;
      const tensor = tf.tensor1d(new Float32Array(msg.buffer));
      classifier.addExample(tensor, msg.label);
      tensor.dispose();
      break;
    }

    case 'predict': {
      if (!classifier || classifier.getNumClasses() === 0) {
        postMessage({ type: 'prediction', id: msg.id, error: 'no_examples' });
        return;
      }
      const tensor = tf.tensor1d(new Float32Array(msg.buffer));
      try {
        const result = await classifier.predictClass(tensor);
        postMessage({
          type: 'prediction',
          id: msg.id,
          label: result.label,
          confidences: result.confidences,
        });
      } catch (e) {
        postMessage({ type: 'prediction', id: msg.id, error: e.message });
      } finally {
        tensor.dispose();
      }
      break;
    }

    case 'getDataset': {
      if (!classifier) {
        postMessage({ type: 'dataset', data: null });
        return;
      }
      const dataset = classifier.getClassifierDataset();
      if (!dataset || Object.keys(dataset).length === 0) {
        postMessage({ type: 'dataset', data: null });
        return;
      }
      const serialized = {};
      for (const [label, tensor] of Object.entries(dataset)) {
        serialized[label] = {
          data: Array.from(tensor.dataSync()),
          shape: tensor.shape,
        };
      }
      postMessage({ type: 'dataset', data: serialized });
      break;
    }

    case 'setDataset': {
      if (!classifier || !msg.data) return;
      const dataset = {};
      for (const [label, { data, shape }] of Object.entries(msg.data)) {
        dataset[label] = tf.tensor(data, shape);
      }
      classifier.setClassifierDataset(dataset);
      postMessage({ type: 'datasetLoaded' });
      break;
    }

    case 'clearAll':
      if (classifier) classifier.clearAllClasses();
      break;

    default:
      break;
  }
});
