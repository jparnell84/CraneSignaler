import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

// Helper: capturing the "moment"
export const captureSnapshot = async (webcamRef, canvasRef, userId, drillId) => {
  if (!webcamRef.current || !canvasRef.current) return null;

  // 1. Create a temporary canvas to merge Video + AI Skeleton
  const video = webcamRef.current.video;
  const skeletonCanvas = canvasRef.current;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  const ctx = tempCanvas.getContext('2d');

  // 2. Draw the raw video frame first
  ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  // 3. Draw the Skeleton Overlay on top (Crucial for validation!)
  // This proves "What the AI saw" vs "What the user did"
  ctx.drawImage(skeletonCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

  // 4. Add a timestamp watermark (Optional but good for audit)
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.fillText(`ID: ${userId} | ${new Date().toISOString()}`, 10, 30);

  // 5. Convert to Base64
  const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.7); // 0.7 quality is fine

  // 6. Upload to Firebase Storage
  const storage = getStorage();
  // Structure: evidence/USER_ID/DRILL_ID_TIMESTAMP.jpg
  const storageRef = ref(storage, `evidence/${userId}/${drillId}_${Date.now()}.jpg`);
  
  try {
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Evidence upload failed:", error);
    return null; // Don't fail the test if upload fails, just log it
  }
};