import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

/**
 * Initialize the MediaPipe FaceLandmarker.
 * Loads the WASM runtime + model from CDN (~10MB, cached by browser).
 * Returns a singleton — safe to call multiple times.
 */
export async function initFaceTracker(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });

    return faceLandmarker;
  })();

  return initPromise;
}

/**
 * Run detection on a video frame.
 * Returns the full FaceLandmarkerResult with blendshapes + transformation matrix.
 */
export function detectFace(video: HTMLVideoElement, timestampMs: number) {
  if (!faceLandmarker) return null;
  return faceLandmarker.detectForVideo(video, timestampMs);
}
