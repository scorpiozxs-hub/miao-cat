module.exports = Object.freeze({
  version: 'find-cat-v4.1', rosterSize: 50, scoreThresholdExclusive: 50,
  maxDurationMs: 180000, countdownMs: 3000, clickIntervalMs: 250,
  scoreSource: 'client-final-onnx', identityPolicy: 'new-player-per-submission',
  modelVersion: process.env.MODEL_VERSION || 'quickdraw-8class-64-v2',
  preprocessVersion: 'alpha-area-64-v2',
  motion: {minSpeed: .02,maxSpeed:.05,minSpin:30,maxSpin:100,minSwitch:2,maxSwitch:5}
});
